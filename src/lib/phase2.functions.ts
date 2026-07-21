import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const FEATURE_PRICING_EGP = { 7: 199, 30: 599 } as const;

// ---------- Feature listing (owner) ----------
export const featureMyListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        listingId: z.string().uuid(),
        days: z.union([z.literal(7), z.literal(30)]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    // Verify ownership
    const { data: row, error: lErr } = await supabase
      .from("listings")
      .select("id, company_id, companies!inner(owner_id)")
      .eq("id", data.listingId)
      .maybeSingle();
    if (lErr) throw new Error(lErr.message);
    if (!row) throw new Error("Listing not found");
    const ownerId = (row as { companies?: { owner_id?: string } }).companies?.owner_id;
    if (ownerId !== userId) throw new Error("Forbidden");

    // Extend featured_until: start from greater of now / current featured_until
    const { data: existing } = await supabase
      .from("listings")
      .select("featured_until")
      .eq("id", data.listingId)
      .maybeSingle();
    const cur = (existing as { featured_until?: string | null })?.featured_until;
    const base = cur && new Date(cur).getTime() > Date.now() ? new Date(cur) : new Date();
    base.setUTCDate(base.getUTCDate() + data.days);

    const { error } = await supabase
      .from("listings")
      .update({ featured: true, featured_until: base.toISOString() })
      .eq("id", data.listingId);
    if (error) throw new Error(error.message);

    // Record pending payment (online payments not yet enabled)
    const { data: c } = await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    await supabase.from("payments").insert({
      user_id: userId,
      company_id: c?.id ?? null,
      listing_id: data.listingId,
      purpose: "featured_listing",
      amount: FEATURE_PRICING_EGP[data.days],
      currency: "EGP",
      status: "pending",
      metadata: { days: data.days },
    });

    return { ok: true, featured_until: base.toISOString() };
  });

// ---------- Submit lead (public) ----------
export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        listingId: z.string().uuid(),
        buyer_name: z.string().trim().min(2).max(120),
        buyer_email: z
          .string()
          .trim()
          .email()
          .max(255)
          .optional()
          .or(z.literal(""))
          .transform((v) => v || undefined),
        buyer_phone: z
          .string()
          .trim()
          .max(40)
          .optional()
          .or(z.literal(""))
          .transform((v) => v || undefined),
        message: z
          .string()
          .trim()
          .max(2000)
          .optional()
          .or(z.literal(""))
          .transform((v) => v || undefined),
        referral_code: z
          .string()
          .trim()
          .min(4)
          .max(32)
          .optional()
          .or(z.literal(""))
          .transform((v) => v || undefined),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: listing, error: lErr } = await supabaseAdmin
      .from("listings")
      .select("id, company_id, status")
      .eq("id", data.listingId)
      .maybeSingle();
    if (lErr) throw new Error(lErr.message);
    if (!listing || listing.status !== "approved") throw new Error("Listing not available");

    if (!data.buyer_email && !data.buyer_phone) {
      throw new Error("Provide email or phone so the company can reach you");
    }

    const { error } = await supabaseAdmin.from("leads").insert({
      listing_id: listing.id,
      company_id: listing.company_id,
      buyer_name: data.buyer_name,
      buyer_email: data.buyer_email ?? null,
      buyer_phone: data.buyer_phone ?? null,
      message: data.message ?? null,
      referral_code: data.referral_code ?? null,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Company: my leads ----------
export const listMyLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!company) return { leads: [], companyId: null };
    const { data, error } = await supabase
      .from("leads")
      .select(
        "id, listing_id, buyer_name, buyer_email, buyer_phone, message, status, created_at, listings(title_ar, title_en)",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { leads: data ?? [], companyId: company.id };
  });

export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        leadId: z.string().uuid(),
        status: z.enum(["new", "contacted", "negotiating", "won", "lost"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("leads")
      .update({ status: data.status })
      .eq("id", data.leadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Stats ----------
export const getCompanyAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: company } = await supabase
      .from("companies")
      .select("id, is_verified")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!company) {
      return {
        hasCompany: false,
        totals: {
          listings: 0,
          views: 0,
          clicks: 0,
          leads: 0,
          agentApplications: 0,
          conversionRate: 0,
        },
        perListing: [],
        isVerified: false,
      };
    }
    const [listingsRes, appsRes] = await Promise.all([
      supabase
        .from("listings")
        .select(
          "id, title_ar, title_en, views_count, clicks_count, leads_count, featured, featured_until, status",
        )
        .eq("company_id", company.id)
        .order("views_count", { ascending: false }),
      supabase
        .from("agent_applications")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company.id),
    ]);
    if (listingsRes.error) throw new Error(listingsRes.error.message);
    const list = listingsRes.data ?? [];
    const totals = list.reduce(
      (acc, r) => {
        acc.views += r.views_count ?? 0;
        acc.clicks += r.clicks_count ?? 0;
        acc.leads += r.leads_count ?? 0;
        return acc;
      },
      {
        listings: list.length,
        views: 0,
        clicks: 0,
        leads: 0,
        agentApplications: appsRes.count ?? 0,
        conversionRate: 0,
      },
    );
    totals.conversionRate =
      totals.views > 0 ? Math.round((totals.leads / totals.views) * 1000) / 10 : 0;
    return {
      hasCompany: true,
      isVerified: !!company.is_verified,
      totals,
      perListing: list,
    };
  });

// ---------- Admin: verify company ----------
export const adminSetCompanyVerified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ companyId: z.string().uuid(), verified: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await supabase
      .from("companies")
      .update({ is_verified: data.verified })
      .eq("id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
