import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function randomCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = ""; for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export const listMyReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: agent } = await supabase.from("agents").select("id").eq("user_id", userId).maybeSingle();
    if (!agent) return { agentId: null, referrals: [] as any[] };
    const { data, error } = await supabase
      .from("referrals")
      .select("id, code, clicks, conversions, created_at, listing_id, listings(title_en, title_ar, commission_percentage, company_id, companies(name_en, name_ar))")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { agentId: agent.id, referrals: data ?? [] };
  });

export const createReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ listingId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: agent } = await supabase.from("agents").select("id").eq("user_id", userId).maybeSingle();
    if (!agent) throw new Error("Create an agent profile first.");
    // dedupe (unique on agent_id+listing_id)
    const { data: existing } = await supabase
      .from("referrals").select("id, code")
      .eq("agent_id", agent.id).eq("listing_id", data.listingId).maybeSingle();
    if (existing) return { ok: true, id: existing.id, code: existing.code, existed: true };

    const code = randomCode();
    const { data: row, error } = await supabase.from("referrals")
      .insert({ agent_id: agent.id, listing_id: data.listingId, code })
      .select("id, code").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id, code: row.code, existed: false };
  });

export const convertReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      referralId: z.string().uuid(),
      amount: z.number().nonnegative(),
      currency: z.string().min(2).max(8).default("USD"),
      notes: z.string().max(500).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: commissionId, error } = await supabase.rpc("convert_referral", {
      _referral_id: data.referralId,
      _amount: data.amount,
      _currency: data.currency,
      _notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true, commissionId };
  });
