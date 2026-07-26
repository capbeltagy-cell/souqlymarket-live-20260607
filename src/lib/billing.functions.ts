import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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
    priceMonthly: 79,
  },
  premium_agent: {
    maxListings: 5,
    maxReferrals: -1,
    featuredListings: false,
    advancedAnalytics: true,
    landingPages: true,
    prioritySupport: true,
    priceMonthly: 29,
  },
};

export const getMyPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: company } = await supabase
      .from("companies")
      .select("id, subscription_plan")
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
    const plan: PlanKey =
      (sub?.plan as PlanKey) ??
      (company?.subscription_plan as PlanKey) ??
      (agent?.subscription_plan as PlanKey) ??
      "free";
    return {
      plan,
      limits: PLAN_LIMITS[plan],
      subscription: sub,
      hasCompany: !!company,
      hasAgent: !!agent,
    };
  });

export const upgradePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ plan: z.enum(["free", "premium_company", "premium_agent"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    // deactivate existing
    await supabase
      .from("subscriptions")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("is_active", true);
    const expires = new Date();
    expires.setMonth(expires.getMonth() + 1);
    const { error } = await supabase.from("subscriptions").insert({
      user_id: userId,
      plan: data.plan,
      is_active: true,
      expires_at: expires.toISOString(),
    });
    if (error) throw new Error(error.message);
    // mirror plan onto company/agent record if present
    if (data.plan === "premium_company") {
      await supabase
        .from("companies")
        .update({ subscription_plan: data.plan })
        .eq("owner_id", userId);
    }
    if (data.plan === "premium_agent") {
      await supabase.from("agents").update({ subscription_plan: data.plan }).eq("user_id", userId);
    }
    return { ok: true, plan: data.plan };
  });
