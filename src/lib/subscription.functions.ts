import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const FREE_LISTING_LIMIT = 5;
export const COMPANY_PLAN_PRICE_EGP = 499;

export type CompanySubscriptionInfo = {
  hasCompany: boolean;
  companyId: string | null;
  isPaid: boolean;
  plan: "free" | "premium_company";
  listingsCount: number;
  listingLimit: number; // -1 = unlimited
  expiresAt: string | null;
};

function computeIsPaid(plan: string | null, expiresAt: string | null): boolean {
  if (plan !== "premium_company") return false;
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > Date.now();
}

export const getMyCompanySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CompanySubscriptionInfo> => {
    const { supabase, userId } = context;
    const { data: company } = await supabase
      .from("companies")
      .select("id, subscription_plan, subscription_expires_at")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!company) {
      return {
        hasCompany: false, companyId: null, isPaid: false, plan: "free",
        listingsCount: 0, listingLimit: FREE_LISTING_LIMIT, expiresAt: null,
      };
    }
    const { count } = await supabase
      .from("listings").select("id", { count: "exact", head: true })
      .eq("company_id", company.id);
    const expiresAt = (company as { subscription_expires_at?: string | null }).subscription_expires_at ?? null;
    const isPaid = computeIsPaid(company.subscription_plan, expiresAt);
    return {
      hasCompany: true,
      companyId: company.id,
      isPaid,
      plan: isPaid ? "premium_company" : "free",
      listingsCount: count ?? 0,
      listingLimit: isPaid ? -1 : FREE_LISTING_LIMIT,
      expiresAt,
    };
  });

// --- Admin ---

export const adminListCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await supabase
      .from("companies")
      .select("id, name_ar, name_en, owner_id, is_verified, subscription_plan, subscription_expires_at, subscription_updated_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((c) => ({
      ...c,
      isPaid: computeIsPaid(c.subscription_plan, (c as { subscription_expires_at?: string | null }).subscription_expires_at ?? null),
    }));
  });

export const adminSetCompanyPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      companyId: z.string().uuid(),
      paid: z.boolean(),
      months: z.number().int().min(1).max(60).default(1),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const expires = new Date();
    expires.setMonth(expires.getMonth() + data.months);
    const update = data.paid
      ? { subscription_plan: "premium_company" as const, subscription_expires_at: expires.toISOString(), subscription_updated_at: new Date().toISOString() }
      : { subscription_plan: "free" as const, subscription_expires_at: null, subscription_updated_at: new Date().toISOString() };
    const { error } = await supabase.from("companies").update(update).eq("id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Public pricing config (single source of truth) ---
// Reads price + commission % from platform_settings so Pricing page and
// admin controls stay in sync. Falls back to sane defaults.
export const getPricingConfig = createServerFn({ method: "GET" })
  .handler(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined as never },
    });
    const { data } = await sb
      .from("platform_settings")
      .select("subscription_plan_price_egp, subscription_marketer_commission_pct")
      .eq("id", true)
      .maybeSingle();
    return {
      companyPremiumPriceEgp: Number(data?.subscription_plan_price_egp ?? COMPANY_PLAN_PRICE_EGP),
      marketerCommissionPct: Number(data?.subscription_marketer_commission_pct ?? 15),
      freeListingLimit: FREE_LISTING_LIMIT,
    };
  });

// User-facing request to activate premium_company. Does NOT flip the plan
// (that stays admin-controlled via adminSetCompanyPaid and is protected by
// protect_company_privileged_fields). This just files a request + notifies
// admins so activation happens after real payment verification.
export const requestCompanyUpgrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ note: z.string().max(500).optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: company } = await supabase
      .from("companies").select("id, name_ar, name_en, subscription_plan")
      .eq("owner_id", userId).maybeSingle();
    if (!company) throw new Error("NO_COMPANY: Create your company profile first.");
    if (company.subscription_plan === "premium_company") {
      return { ok: true, alreadyPremium: true as const };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Record a pending subscription row (idempotent-ish: one active pending per user).
    await supabaseAdmin.from("subscriptions")
      .update({ is_active: false })
      .eq("user_id", userId).eq("plan", "premium_company").eq("is_active", true);
    await supabaseAdmin.from("subscriptions").insert({
      user_id: userId, plan: "premium_company", is_active: false,
    });
    // Notify all admins.
    const { data: admins } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
    const companyName = company.name_ar || company.name_en || "شركة";
    const rows = (admins ?? []).map((a: { user_id: string }) => ({
      user_id: a.user_id,
      type: "subscription",
      title: "طلب اشتراك جديد",
      body: `${companyName} طلبت تفعيل الباقة المميزة. راجع في إدارة الشركات.`,
      link: "/admin-companies",
    }));
    if (rows.length) await supabaseAdmin.from("notifications").insert(rows);
    return { ok: true, requested: true as const, note: data.note ?? null };
  });
