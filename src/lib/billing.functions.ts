import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlanKey = "free" | "premium_company" | "premium_agent";

export const PLAN_LIMITS: Record<
  PlanKey,
  {
    maxListings: number; // -1 = unlimited
    maxReferrals: number;
    featuredListings: boolean;
    advancedAnalytics: boolean;
    landingPages: boolean;
    prioritySupport: boolean;
    priceMonthly: number;
  }
> = {
  free: {
    maxListings: 5,
    maxReferrals: 3,
    featuredListings: false,
    advancedAnalytics: false,
    landingPages: false,
    prioritySupport: false,
    priceMonthly: 0,
  },
  premium_company: {
    maxListings: -1,
    maxReferrals: -1,
    featuredListings: true,
    advancedAnalytics: true,
    landingPages: false,
    prioritySupport: true,
    priceMonthly: 499,
  },
  premium_agent: {
    maxListings: 5,
    maxReferrals: -1,
    featuredListings: false,
    advancedAnalytics: true,
    landingPages: true,
    prioritySupport: true,
    priceMonthly: 0,
  },
};

export const getMyPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: company } = await supabase
      .from("companies")
      .select("id, subscription_plan, subscription_expires_at")
      .eq("owner_id", userId)
      .maybeSingle();
    const { data: agent } = await supabase
      .from("agents")
      .select("id, subscription_plan")
      .eq("user_id", userId)
      .maybeSingle();
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan, started_at, expires_at, is_active")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const subscriptionIsCurrent =
      Boolean(sub?.is_active) &&
      (!sub?.expires_at || new Date(sub.expires_at).getTime() > Date.now());
    const companyPlanIsCurrent =
      company?.subscription_plan === "premium_company" &&
      (!company.subscription_expires_at ||
        new Date(company.subscription_expires_at).getTime() > Date.now());
    const candidate = subscriptionIsCurrent
      ? sub?.plan
      : companyPlanIsCurrent
        ? company.subscription_plan
        : agent?.subscription_plan;
    const plan: PlanKey =
      candidate === "premium_company" || candidate === "premium_agent" ? candidate : "free";
    return {
      plan,
      limits: PLAN_LIMITS[plan],
      subscription: sub,
      hasCompany: !!company,
      hasAgent: !!agent,
    };
  });
