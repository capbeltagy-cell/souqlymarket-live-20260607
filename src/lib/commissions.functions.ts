import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // Try as agent first
    const { data: agent } = await supabase
      .from("agents")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    const { data: company } = await supabase
      .from("companies")
      .select("id, name_en, name_ar")
      .eq("owner_id", userId)
      .maybeSingle();
    const role: "agent" | "company" | "admin" | "none" = agent
      ? "agent"
      : company
        ? "company"
        : "none";

    let query = supabase
      .from("commissions")
      .select(
        `
      id, amount, currency, status, notes, created_at, payout_requested_at, paid_at,
      listing_id, agent_id, company_id,
      listings(title_en, title_ar),
      agents(headline_en, user_id),
      companies(name_en, name_ar)
    `,
      )
      .order("created_at", { ascending: false });

    if (role === "agent" && agent) query = query.eq("agent_id", agent.id);
    else if (role === "company" && company) query = query.eq("company_id", company.id);

    const { data, error } = await query.limit(500);
    if (error) throw new Error(error.message);
    return { role, commissions: data ?? [] };
  });

export const updateCommissionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "approved", "paid"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    // Only admins can change commission status. The commission_to_wallet
    // trigger credits the marketer wallet on status=paid, so allowing any
    // user to set status=paid would be a direct money bypass.
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await supabase
      .from("commissions")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const requestPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    // Ownership check: only the agent who owns the commission can request payout.
    const { data: commission } = await (supabase.from("commissions" as never) as any)
      .select("id, agent_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!commission) throw new Error("Commission not found");
    const { data: agent } = await (supabase.from("agents" as never) as any)
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!agent || agent.id !== commission.agent_id) {
      throw new Error("غير مسموح لك بطلب صرف عمولة لا تخصك");
    }
    const { error } = await (supabase.from("commissions" as never) as any)
      .update({ payout_requested_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Admin: review auto-created (and manual) commissions --------
async function requireAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const adminListCommissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        status: z.enum(["pending", "approved", "paid", "all"]).default("pending"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    let q = supabase
      .from("commissions")
      .select(
        `
      id, amount, currency, status, notes, created_at, paid_at, payout_requested_at,
      listing_id, agent_id, company_id,
      listings(title_en, title_ar),
      agents(headline_en, user_id, profiles:user_id(display_name, full_name)),
      companies(name_en, name_ar)
    `,
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { commissions: rows ?? [] };
  });

export const adminReviewCommission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["approve", "reject", "paid"]),
        notes: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);

    if (data.action === "reject") {
      const { data: existing, error: eErr } = await supabase
        .from("commissions")
        .select("id, status")
        .eq("id", data.id)
        .maybeSingle();
      if (eErr) throw new Error(eErr.message);
      if (!existing) throw new Error("Commission not found");
      if (existing.status !== "pending")
        throw new Error("Only pending commissions can be rejected");
      const { error } = await supabase.from("commissions").delete().eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, deleted: true };
    }

    // Idempotency: block re-paying an already-paid commission.
    if (data.action === "paid") {
      const { data: existing } = await supabase
        .from("commissions")
        .select("status")
        .eq("id", data.id)
        .maybeSingle();
      if (existing?.status === "paid") {
        return { ok: true, alreadyPaid: true as const };
      }
    }

    const nextStatus = data.action === "approve" ? ("approved" as const) : ("paid" as const);
    const patch: { status: "approved" | "paid"; notes?: string } = { status: nextStatus };
    if (data.notes) patch.notes = data.notes;
    const { error } = await supabase.from("commissions").update(patch).eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
