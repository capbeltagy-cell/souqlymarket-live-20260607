import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ============ Campaigns ============
export const listMyCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: ag } = await supabase.from("agents").select("id").eq("user_id", userId).maybeSingle();
    if (!ag) return { hasAgent: false, campaigns: [] as any[] };
    const { data, error } = await supabase
      .from("agent_campaigns")
      .select("*, listings(title_ar, title_en), referrals(id, code, clicks, conversions)")
      .eq("agent_id", ag.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { hasAgent: true, campaigns: data ?? [] };
  });

export const createCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    name: z.string().min(2).max(200),
    description: z.string().max(2000).optional().nullable(),
    category: z.string().max(80).optional().nullable(),
    status: z.enum(["draft","active","paused","ended"]).default("active"),
    listingId: z.string().uuid().optional().nullable(),
    targetUrl: z.string().url().optional().nullable(),
    startAt: z.string().datetime().optional().nullable(),
    endAt: z.string().datetime().optional().nullable(),
    budget: z.number().nonnegative().optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: ag } = await supabase.from("agents").select("id").eq("user_id", userId).maybeSingle();
    if (!ag) throw new Error("Create an agent profile first");
    const { data: row, error } = await supabase.from("agent_campaigns").insert({
      agent_id: ag.id,
      name: data.name,
      description: data.description ?? null,
      category: data.category ?? null,
      status: data.status,
      listing_id: data.listingId ?? null,
      target_url: data.targetUrl ?? null,
      start_at: data.startAt ?? null,
      end_at: data.endAt ?? null,
      budget: data.budget ?? null,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    name: z.string().min(2).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    category: z.string().max(80).nullable().optional(),
    status: z.enum(["draft","active","paused","ended"]).optional(),
    listingId: z.string().uuid().nullable().optional(),
    targetUrl: z.string().url().nullable().optional(),
    startAt: z.string().datetime().nullable().optional(),
    endAt: z.string().datetime().nullable().optional(),
    budget: z.number().nonnegative().nullable().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const patch: any = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;
    if (data.category !== undefined) patch.category = data.category;
    if (data.status !== undefined) patch.status = data.status;
    if (data.listingId !== undefined) patch.listing_id = data.listingId;
    if (data.targetUrl !== undefined) patch.target_url = data.targetUrl;
    if (data.startAt !== undefined) patch.start_at = data.startAt;
    if (data.endAt !== undefined) patch.end_at = data.endAt;
    if (data.budget !== undefined) patch.budget = data.budget;
    const { error } = await supabase.from("agent_campaigns").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("agent_campaigns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getCampaignAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const [{ data: refs }, { data: camp }] = await Promise.all([
      supabase.from("referrals").select("id, code, clicks, conversions").eq("campaign_id", data.id),
      supabase.from("agent_campaigns").select("*, listings(title_ar, title_en)").eq("id", data.id).maybeSingle(),
    ]);
    const rows = refs ?? [];
    const clicks = rows.reduce((s, r) => s + (r.clicks ?? 0), 0);
    const conversions = rows.reduce((s, r) => s + (r.conversions ?? 0), 0);
    const rate = clicks ? Math.round((conversions / clicks) * 1000) / 10 : 0;
    return { campaign: camp, clicks, conversions, rate, links: rows };
  });

// ============ Payout methods ============
export const listMyPayoutMethods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("payout_methods").select("*").order("is_default", { ascending: false }).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { methods: data ?? [] };
  });

export const createPayoutMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    kind: z.enum(["bank","vodafone_cash","instapay","orange_money","etisalat_cash","wallet","usdt_binance","usdt_bybit"]),
    label: z.string().min(2).max(120),
    details: z.record(z.string(), z.any()).default({}),
    isDefault: z.boolean().default(false),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (data.isDefault) {
      await supabase.from("payout_methods").update({ is_default: false }).eq("user_id", userId);
    }
    const { data: row, error } = await supabase.from("payout_methods").insert({
      user_id: userId, kind: data.kind, label: data.label, details: data.details, is_default: data.isDefault,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deletePayoutMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("payout_methods").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Payouts ============
export const listMyPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("payout_requests")
      .select("*, payout_methods(label, kind)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { payouts: data ?? [] };
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    amount: z.number().positive(),
    walletKind: z.enum(["agent","company"]).default("agent"),
    payoutMethodId: z.string().uuid().optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: settings } = await (supabase.from("platform_settings" as never) as any).select("min_withdrawal_amount").maybeSingle();
    const minAmount = Number(settings?.min_withdrawal_amount ?? 100);
    if (data.amount < minAmount) throw new Error(`الحد الأدنى للسحب ${minAmount} ج.م`);
    if (!data.payoutMethodId) throw new Error("اختر طريقة السحب أولاً");
    const { data: dup } = await supabase.from("payout_requests").select("id").eq("user_id", userId).eq("status", "pending").limit(1);
    if (dup && dup.length > 0) throw new Error("لديك طلب سحب قيد المراجعة بالفعل");
    // Guarantee the wallet exists (creates a zero-balance row on first use)
    const { data: walletId, error: ensureErr } = await supabase.rpc("ensure_wallet", {
      _user_id: userId, _kind: data.walletKind,
    });
    if (ensureErr) throw new Error(ensureErr.message);
    const { data: wallet } = await supabase.from("wallets").select("id, balance").eq("id", walletId as string).maybeSingle();
    if (!wallet) throw new Error("Wallet could not be created");
    if (Number(wallet.balance) < data.amount) throw new Error("Insufficient balance");
    const { data: row, error } = await supabase.from("payout_requests").insert({
      user_id: userId,
      wallet_id: wallet.id,
      amount: data.amount,
      payout_method_id: data.payoutMethodId ?? null,
      notes: data.notes ?? null,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// ============ Platform settings & admin withdrawals ============
export const getPlatformSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase.from("platform_settings" as never) as any).select("*").maybeSingle();
    if (error) throw new Error(error.message);
    return { settings: data };
  });

export const updatePlatformSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    marketer_commission_pct: z.number().min(0).max(100),
    platform_commission_pct: z.number().min(0).max(100),
    min_withdrawal_amount: z.number().nonnegative(),
    withdrawal_review_mode: z.enum(["manual","auto"]).default("manual"),
    subscription_marketer_commission_pct: z.number().min(0).max(100).optional(),
    subscription_plan_price_egp: z.number().nonnegative().optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await (context.supabase.from("platform_settings" as never) as any)
      .update({ ...data, updated_by: context.userId, updated_at: new Date().toISOString() })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const adminListWithdrawals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    status: z.enum(["pending","approved","paid","rejected","cancelled","all"]).default("pending"),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    let q = context.supabase.from("payout_requests")
      .select("*, payout_methods(label, kind, details), profiles!payout_requests_user_id_fkey(full_name, display_name)")
      .order("created_at", { ascending: false }).limit(500);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { payouts: rows ?? [] };
  });

export const adminUpdateWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    action: z.enum(["approve","reject","paid"]),
    admin_notes: z.string().max(500).optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const status = data.action === "approve" ? "approved" : data.action === "reject" ? "rejected" : "paid";
    const { error } = await context.supabase.from("payout_requests")
      .update({ status, admin_notes: data.admin_notes ?? null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const cancelWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("payout_requests").update({ status: "cancelled" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Leaderboard & Achievements ============
export const getLeaderboard = createServerFn({ method: "GET" })
  .handler(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await sb.from("marketer_leaderboard")
      .select("agent_id, name, avatar_url, total_earned, deals_closed, achievements_count")
      .order("total_earned", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { leaders: data ?? [] };
  });

export const getMyAchievements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: ag } = await supabase.from("agents").select("id").eq("user_id", userId).maybeSingle();
    if (!ag) return { achievements: [] as any[] };
    const { data, error } = await supabase.from("agent_achievements").select("*").eq("agent_id", ag.id).order("earned_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { achievements: data ?? [] };
  });

// ============ AI Generators ============
async function callLovableAI(system: string, user: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limited. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits.");
    throw new Error(`AI error ${res.status}`);
  }
  const j = await res.json();
  return j?.choices?.[0]?.message?.content ?? "";
}

export const generateAdCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    product: z.string().min(2).max(500),
    audience: z.string().max(300).optional().nullable(),
    tone: z.enum(["professional","friendly","urgent","luxury","playful"]).default("friendly"),
    locale: z.enum(["ar","en"]).default("ar"),
    variants: z.number().int().min(1).max(5).default(3),
  }).parse(d))
  .handler(async ({ data }) => {
    const sys = `You are a top Egyptian marketing copywriter. Write ${data.variants} short high-converting ad copy variants in ${data.locale === "ar" ? "Arabic" : "English"}. Use ${data.tone} tone. Include a strong hook and a clear CTA. Return each variant on its own line, prefixed with "— ".`;
    const usr = `Product/Offer: ${data.product}${data.audience ? `\nAudience: ${data.audience}` : ""}`;
    return { text: await callLovableAI(sys, usr) };
  });

export const generateSocialPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    topic: z.string().min(2).max(500),
    platform: z.enum(["facebook","instagram","tiktok","whatsapp","x","linkedin"]).default("facebook"),
    locale: z.enum(["ar","en"]).default("ar"),
    includeHashtags: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ data }) => {
    const sys = `You write engaging ${data.platform} posts in ${data.locale === "ar" ? "Arabic" : "English"}. Keep it native to ${data.platform} (length, emojis, tone). ${data.includeHashtags ? "Add 3-6 relevant hashtags at the end." : "No hashtags."} Add a clear CTA to click the referral link.`;
    return { text: await callLovableAI(sys, `Topic: ${data.topic}`) };
  });

export const generateProductPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    listingId: z.string().uuid().optional().nullable(),
    product: z.string().min(2).max(500).optional().nullable(),
    channel: z.enum(["email","whatsapp","sms","social"]).default("whatsapp"),
    locale: z.enum(["ar","en"]).default("ar"),
  }).parse(d))
  .handler(async ({ context, data }) => {
    let product = data.product ?? "";
    if (!product && data.listingId) {
      const { data: l } = await context.supabase.from("listings")
        .select("title_ar, title_en, description_ar, description_en, price")
        .eq("id", data.listingId).maybeSingle();
      if (l) {
        const title = (data.locale === "ar" ? l.title_ar : l.title_en) ?? l.title_ar ?? l.title_en ?? "";
        const desc = (data.locale === "ar" ? l.description_ar : l.description_en) ?? "";
        product = `${title}\n${desc}${l.price ? `\nPrice: ${l.price} EGP` : ""}`;
      }
    }
    if (!product) throw new Error("Provide a product or listing");
    const sys = `You are a persuasive product-promotion writer for the ${data.channel} channel in ${data.locale === "ar" ? "Arabic (Egyptian dialect friendly)" : "English"}. Keep length appropriate for ${data.channel}. End with a clear CTA to click the referral link and buy now.`;
    return { text: await callLovableAI(sys, product) };
  });
