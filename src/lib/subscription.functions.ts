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
