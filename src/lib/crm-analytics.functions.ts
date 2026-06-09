import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------- Agent Performance ----------
export const getAgentPerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: ag } = await supabase
      .from("agents").select("id").eq("user_id", userId).maybeSingle();
    if (!ag) {
      return {
        hasAgent: false,
        leadsGenerated: 0, conversions: 0, conversionRate: 0,
        totalCommissions: 0, pendingCommissions: 0, paidCommissions: 0,
        currency: "EGP" as const,
        topListings: [] as { id: string; title: string; clicks: number; conversions: number }[],
      };
    }
    const [refs, comms] = await Promise.all([
      supabase.from("referrals")
        .select("id, listing_id, clicks, conversions, listings(title_ar, title_en)")
        .eq("agent_id", ag.id),
      supabase.from("commissions").select("amount, status").eq("agent_id", ag.id),
    ]);
    const refRows = (refs.data ?? []) as any[];
    const leadsGenerated = refRows.reduce((s, r) => s + (r.clicks ?? 0), 0);
    const conversions = refRows.reduce((s, r) => s + (r.conversions ?? 0), 0);
    const conversionRate = leadsGenerated > 0
      ? Math.round((conversions / leadsGenerated) * 1000) / 10
      : 0;
    const commRows = (comms.data ?? []) as any[];
    const totalCommissions = commRows.reduce((s, c) => s + Number(c.amount ?? 0), 0);
    const pendingCommissions = commRows.filter((c) => c.status === "pending")
      .reduce((s, c) => s + Number(c.amount ?? 0), 0);
    const paidCommissions = commRows.filter((c) => c.status === "paid")
      .reduce((s, c) => s + Number(c.amount ?? 0), 0);
    const topListings = refRows
      .map((r) => ({
        id: r.listing_id as string,
        title: (r.listings?.title_en ?? r.listings?.title_ar ?? "—") as string,
        clicks: r.clicks ?? 0,
        conversions: r.conversions ?? 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);
    return {
      hasAgent: true,
      leadsGenerated, conversions, conversionRate,
      totalCommissions, pendingCommissions, paidCommissions,
      currency: "EGP" as const,
      topListings,
    };
  });

// ---------- Referral Analytics (agent) ----------
export const getMyReferralAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: ag } = await supabase
      .from("agents").select("id").eq("user_id", userId).maybeSingle();
    if (!ag) return { clicks: 0, registrations: 0, conversions: 0, revenue: 0, currency: "EGP" as const };
    const [refs, comms, companyRefs] = await Promise.all([
      supabase.from("referrals").select("clicks, conversions").eq("agent_id", ag.id),
      supabase.from("commissions").select("amount").eq("agent_id", ag.id),
      supabase.from("company_referrals").select("signups").eq("owner_user_id", userId),
    ]);
    const refRows = (refs.data ?? []) as any[];
    const clicks = refRows.reduce((s, r) => s + (r.clicks ?? 0), 0);
    const conversions = refRows.reduce((s, r) => s + (r.conversions ?? 0), 0);
    const registrations = ((companyRefs.data ?? []) as any[])
      .reduce((s, r) => s + (r.signups ?? 0), 0);
    const revenue = ((comms.data ?? []) as any[])
      .reduce((s, c) => s + Number(c.amount ?? 0), 0);
    return { clicks, registrations, conversions, revenue, currency: "EGP" as const };
  });

// ---------- Admin Executive Dashboard ----------
export const getAdminExecutiveDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const since30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
    const nowIso = now.toISOString();

    const [payments, companies, agents, subsPayments, commsPending, listings, newCompanies, newAgents, platformWallet] = await Promise.all([
      supabaseAdmin.from("payments").select("amount, purpose, status, created_at"),
      supabaseAdmin.from("companies").select("id, subscription_plan, subscription_expires_at, category_slug"),
      supabaseAdmin.from("agents").select("id"),
      supabaseAdmin.from("payments").select("amount").eq("status", "paid").eq("purpose", "subscription"),
      supabaseAdmin.from("commissions").select("amount").eq("status", "pending"),
      supabaseAdmin.from("listings").select("category_slug, leads_count").eq("status", "approved"),
      supabaseAdmin.from("companies").select("id", { count: "exact", head: true }).gte("created_at", since30),
      supabaseAdmin.from("agents").select("id", { count: "exact", head: true }).gte("created_at", since30),
      supabaseAdmin.from("wallets").select("balance").eq("kind", "platform").maybeSingle(),
    ]);

    const paid = ((payments.data ?? []) as any[]).filter((p) => p.status === "paid");
    const totalRevenue = paid.reduce((s, p) => s + Number(p.amount ?? 0), 0)
      + Number(platformWallet.data?.balance ?? 0); // platform commission cut
    const subscriptionRevenue = ((subsPayments.data ?? []) as any[])
      .reduce((s, p) => s + Number(p.amount ?? 0), 0);
    const pendingPayouts = ((commsPending.data ?? []) as any[])
      .reduce((s, c) => s + Number(c.amount ?? 0), 0);
    const cs = (companies.data ?? []) as any[];
    const activeCompanies = cs.filter((c) =>
      c.subscription_plan === "paid" && (!c.subscription_expires_at || c.subscription_expires_at > nowIso),
    ).length;
    const activeAgents = (agents.data ?? []).length;

    const catTotals = new Map<string, number>();
    for (const l of (listings.data ?? []) as any[]) {
      if (!l.category_slug) continue;
      catTotals.set(l.category_slug, (catTotals.get(l.category_slug) ?? 0) + (l.leads_count ?? 0));
    }
    const topCategories = [...catTotals.entries()]
      .map(([slug, leads]) => ({ slug, leads }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 5);

    return {
      totalRevenue,
      activeCompanies,
      activeAgents,
      newRegistrations: (newCompanies.count ?? 0) + (newAgents.count ?? 0),
      newCompanies30d: newCompanies.count ?? 0,
      newAgents30d: newAgents.count ?? 0,
      subscriptionRevenue,
      pendingPayouts,
      topCategories,
      currency: "EGP" as const,
    };
  });
