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
  }
> = {
  free: {
    maxListings: 5,
    maxReferrals: 3,
    featuredListings: false,
    advancedAnalytics: false,
    landingPages: false,
    prioritySupport: false,
  },
  premium_company: {
    maxListings: -1,
    maxReferrals: -1,
    featuredListings: true,
    advancedAnalytics: true,
    landingPages: false,
    prioritySupport: true,
  },
  premium_agent: {
    maxListings: 5,
    maxReferrals: -1,
    featuredListings: false,
    advancedAnalytics: true,
    landingPages: true,
    prioritySupport: true,
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

// Removed free upgradePlan. Premium activation requires verified payment
// or admin approval. Use requestCompanyUpgrade (subscription.functions.ts)
// to file a request, and adminSetCompanyPaid to activate after payment.
// This function is kept only as a no-op for backward compatibility so
// existing callers don't crash - it never flips the plan.
export const upgradePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ plan: z.enum(["free", "premium_company", "premium_agent"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (data.plan === "free") {
      // Downgrade to free is allowed (no payment needed to remove perks).
      await supabase
        .from("subscriptions")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("is_active", true);
      await supabase.from("companies").update({ subscription_plan: "free" }).eq("owner_id", userId);
      await supabase.from("agents").update({ subscription_plan: "free" }).eq("user_id", userId);
      return { ok: true, plan: "free" as const };
    }
    // Premium plans require admin approval or verified payment.
    // Direct self-upgrade is blocked.
    throw new Error(
      "لا يمكن ترقية حسابك مباشرة. اطلب الترقية من لوحة التحكم وسيتم تفعيلها بعد التحقق من الدفع.",
    );
  });
