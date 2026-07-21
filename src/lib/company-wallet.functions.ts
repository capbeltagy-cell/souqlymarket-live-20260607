import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Return (creating if needed) the caller's company funding wallet + recent tx. */
export const getMyCompanyFundingWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: company } = await supabase
      .from("companies")
      .select("id, name_ar, name_en")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!company) return { company: null, wallet: null, transactions: [] };

    const { data: existing } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .eq("kind", "company_funding" as never)
      .maybeSingle();

    let wallet = existing;
    if (!wallet) {
      // Ensure via RPC (SECURITY DEFINER)
      const { error: rErr } = await supabase.rpc("ensure_company_funding_wallet" as never);
      if (rErr) throw new Error(rErr.message);
      const { data: created } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .eq("kind", "company_funding" as never)
        .maybeSingle();
      wallet = created;
    }
    if (!wallet) throw new Error("Wallet not found");

    const { data: tx } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false })
      .limit(50);
    return { company, wallet, transactions: tx ?? [] };
  });

export const createCompanyDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        amount: z.number().positive().max(10_000_000),
        currency: z.string().default("EGP"),
        method_code: z.string().max(50).optional().nullable(),
        reference: z.string().max(200).optional().nullable(),
        proof_url: z.string().url().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!company) throw new Error("Create a company profile first.");
    const { data: row, error } = await supabase
      .from("company_deposits" as never)
      .insert({
        company_id: company.id,
        owner_id: userId,
        amount: data.amount,
        currency: data.currency,
        method_code: data.method_code ?? null,
        reference: data.reference ?? null,
        proof_url: data.proof_url ?? null,
        status: "pending",
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: (row as { id: string }).id };
  });

export const listMyCompanyDeposits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("company_deposits" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { deposits: data ?? [] };
  });

export const cancelMyCompanyDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("company_deposits" as never)
      .update({ status: "cancelled" } as never)
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Admin --------
async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const adminListCompanyDeposits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        status: z
          .enum(["pending", "under_review", "approved", "rejected", "cancelled", "all"])
          .default("pending"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("company_deposits" as never)
      .select("*, companies(name_ar, name_en)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { deposits: rows ?? [] };
  });

export const adminReviewCompanyDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["approve", "reject"]),
        admin_notes: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.action === "approve") {
      const { error } = await context.supabase.rpc(
        "approve_company_deposit" as never,
        {
          _deposit_id: data.id,
          _admin_notes: data.admin_notes ?? null,
        } as never,
      );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.rpc(
        "reject_company_deposit" as never,
        {
          _deposit_id: data.id,
          _admin_notes: data.admin_notes ?? null,
        } as never,
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// -------- Promotion activate/deactivate (reserve gate) --------
export const activateListingPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        listing_id: z.string().uuid(),
        campaign_max_conversions: z.number().int().positive().optional().nullable(),
        campaign_budget_egp: z.number().positive().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    // Verify ownership (RLS will re-verify)
    const { data: l } = await supabase
      .from("listings")
      .select("id, company_id")
      .eq("id", data.listing_id)
      .maybeSingle();
    if (!l) throw new Error("Listing not found");
    const { data: c } = await supabase
      .from("companies")
      .select("id")
      .eq("id", l.company_id)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!c) throw new Error("Not authorized");

    // Persist campaign caps if provided
    const patch: Record<string, unknown> = {};
    if (data.campaign_max_conversions !== undefined)
      patch.campaign_max_conversions = data.campaign_max_conversions;
    if (data.campaign_budget_egp !== undefined)
      patch.campaign_budget_egp = data.campaign_budget_egp;
    if (Object.keys(patch).length > 0) {
      const { error: uErr } = await supabase
        .from("listings")
        .update(patch as never)
        .eq("id", data.listing_id);
      if (uErr) throw new Error(uErr.message);
    }

    const { data: res, error } = await supabase.rpc(
      "activate_listing_promotion" as never,
      {
        _listing_id: data.listing_id,
      } as never,
    );
    if (error) throw new Error(error.message);
    return { ok: true, result: res };
  });

export const deactivateListingPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        listing_id: z.string().uuid(),
        status: z.enum(["paused", "ended"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: res, error } = await context.supabase.rpc(
      "deactivate_listing_promotion" as never,
      {
        _listing_id: data.listing_id,
        _status: data.status,
      } as never,
    );
    if (error) throw new Error(error.message);
    return { ok: true, result: res };
  });

export const previewListingReserve = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ listing_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: res, error } = await context.supabase.rpc(
      "compute_listing_required_reserve" as never,
      {
        _listing_id: data.listing_id,
      } as never,
    );
    if (error) throw new Error(error.message);
    return { required_reserve: (res as number | null) ?? null };
  });
