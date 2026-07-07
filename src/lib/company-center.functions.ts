import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ============================================================================
// Company Command Center — one aggregated payload for the dashboard.
// Everything is scoped to the authenticated user's company_id (server-side).
// ============================================================================

export type CommandCenterPayload = {
  hasCompany: boolean;
  company: {
    id: string;
    name_ar: string | null;
    name_en: string | null;
    logo_url: string | null;
    cover_url: string | null;
    description_ar: string | null;
    description_en: string | null;
    governorate: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    industry: string | null;
    subscription_plan: string | null;
    subscription_expires_at: string | null;
    is_verified: boolean | null;
  } | null;
  subscription: { isPaid: boolean; plan: string; expiresAt: string | null };
  profileCompletion: { pct: number; done: number; total: number };
  kpis: {
    activeProducts: number;
    activeServices: number;
    totalListings: number;
    totalLeads: number;
    newLeads: number;
    activePromotedListings: number;
    activeCampaigns: number;
    participatingMarketers: number;
    referralClicks: number;
    referralConversions: number;
    conversionRate: number;
    totalCommissionsEgp: number;
    pendingCommissionsEgp: number;
  };
  checklist: Array<{ key: string; label_ar: string; label_en: string; done: boolean; ctaTo: string }>;
  activity: Array<{
    id: string;
    kind: "lead" | "commission" | "referral" | "subscription";
    at: string;
    title_ar: string;
    title_en: string;
    link?: string;
  }>;
};

export const getCompanyCommandCenter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CommandCenterPayload> => {
    const { supabase, userId } = context;

    const { data: company } = await supabase
      .from("companies")
      .select("id, name_ar, name_en, logo_url, cover_url, description_ar, description_en, governorate, city, phone, email, website, industry, subscription_plan, subscription_expires_at, is_verified")
      .eq("owner_id", userId)
      .maybeSingle();

    if (!company) {
      return {
        hasCompany: false, company: null,
        subscription: { isPaid: false, plan: "free", expiresAt: null },
        profileCompletion: { pct: 0, done: 0, total: 8 },
        kpis: {
          activeProducts: 0, activeServices: 0, totalListings: 0,
          totalLeads: 0, newLeads: 0, activePromotedListings: 0,
          activeCampaigns: 0, participatingMarketers: 0,
          referralClicks: 0, referralConversions: 0, conversionRate: 0,
          totalCommissionsEgp: 0, pendingCommissionsEgp: 0,
        },
        checklist: [],
        activity: [],
      };
    }

    const cid = company.id;
    const exp = (company as any).subscription_expires_at ?? null;
    const isPaid = company.subscription_plan === "premium_company" && (!exp || new Date(exp).getTime() > Date.now());

    // Listings scoped to this company
    const { data: listings } = await supabase
      .from("listings")
      .select("id, type, status, marketer_promotion_enabled, promotion_status")
      .eq("company_id", cid);
    const L = listings ?? [];
    const listingIds = L.map((l) => l.id);
    const activeProducts = L.filter((l) => l.type === "product" && l.status === "approved").length;
    const activeServices = L.filter((l) => l.type === "service" && l.status === "approved").length;
    const activePromotedListings = L.filter((l) => l.marketer_promotion_enabled && (l.promotion_status ?? "active") === "active" && l.status === "approved").length;

    // Leads
    const [{ count: totalLeads }, { count: newLeads }] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("company_id", cid),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("company_id", cid).eq("status", "new"),
    ]);

    // Referrals on this company's listings
    let referralClicks = 0, referralConversions = 0, participatingMarketers = 0;
    if (listingIds.length > 0) {
      const { data: refs } = await supabase
        .from("referrals").select("agent_id, clicks, conversions").in("listing_id", listingIds);
      const R = refs ?? [];
      referralClicks = R.reduce((s, r) => s + (r.clicks ?? 0), 0);
      referralConversions = R.reduce((s, r) => s + (r.conversions ?? 0), 0);
      participatingMarketers = new Set(R.map((r) => r.agent_id)).size;
    }
    const conversionRate = referralClicks > 0 ? Math.round((referralConversions / referralClicks) * 1000) / 10 : 0;

    // Active agent campaigns targeting this company's promoted listings
    let activeCampaigns = 0;
    if (listingIds.length > 0) {
      const { count } = await supabase
        .from("agent_campaigns").select("id", { count: "exact", head: true })
        .in("listing_id", listingIds).eq("status", "active");
      activeCampaigns = count ?? 0;
    }

    // Commissions on this company (paid out / pending)
    const { data: comms } = await supabase
      .from("commissions").select("amount, status").eq("company_id", cid);
    const C = comms ?? [];
    const totalCommissionsEgp = C.reduce((s, c) => s + Number(c.amount ?? 0), 0);
    const pendingCommissionsEgp = C.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.amount ?? 0), 0);

    // Profile completion checklist
    const has = (v: unknown) => !!(v && String(v).trim().length > 0);
    const checklist = [
      { key: "created", label_ar: "إنشاء الشركة", label_en: "Company created", done: true, ctaTo: "/company" },
      { key: "logo", label_ar: "رفع الشعار", label_en: "Upload logo", done: has((company as any).logo_url), ctaTo: "/company" },
      { key: "cover", label_ar: "رفع صورة الغلاف", label_en: "Upload cover image", done: has((company as any).cover_url), ctaTo: "/company" },
      { key: "description", label_ar: "كتابة وصف الشركة", label_en: "Company description", done: has((company as any).description_ar) || has((company as any).description_en), ctaTo: "/company" },
      { key: "governorate", label_ar: "اختيار المحافظة", label_en: "Governorate selected", done: has((company as any).governorate), ctaTo: "/company" },
      { key: "city", label_ar: "اختيار المدينة", label_en: "City selected", done: has((company as any).city), ctaTo: "/company" },
      { key: "contact", label_ar: "معلومات التواصل", label_en: "Contact information", done: has((company as any).phone) || has((company as any).email), ctaTo: "/company" },
      { key: "first_product", label_ar: "نشر أول منتج", label_en: "Publish first product", done: activeProducts > 0, ctaTo: "/listings/new" },
      { key: "first_service", label_ar: "نشر أول خدمة", label_en: "Publish first service", done: activeServices > 0, ctaTo: "/listings/new" },
      { key: "first_promotion", label_ar: "تفعيل أول عرض للمسوقين", label_en: "Activate first marketer promotion", done: activePromotedListings > 0, ctaTo: "/company-campaigns" },
      { key: "subscription", label_ar: "تفعيل الاشتراك المدفوع", label_en: "Activate paid subscription", done: isPaid, ctaTo: "/subscribe" },
    ];
    const done = checklist.filter((c) => c.done).length;
    const pct = Math.round((done / checklist.length) * 100);

    // Recent activity — merge last leads / commissions / referrals for this company
    const [{ data: recentLeads }, { data: recentComms }] = await Promise.all([
      supabase.from("leads").select("id, name, created_at").eq("company_id", cid).order("created_at", { ascending: false }).limit(5),
      supabase.from("commissions").select("id, amount, currency, status, created_at").eq("company_id", cid).order("created_at", { ascending: false }).limit(5),
    ]);
    const activity: CommandCenterPayload["activity"] = [];
    for (const l of (recentLeads ?? [])) {
      activity.push({ id: `lead-${l.id}`, kind: "lead", at: l.created_at, title_ar: `عميل محتمل جديد: ${l.name ?? "غير معروف"}`, title_en: `New lead: ${l.name ?? "unknown"}`, link: "/leads" });
    }
    for (const c of (recentComms ?? [])) {
      activity.push({
        id: `comm-${c.id}`, kind: "commission", at: c.created_at,
        title_ar: `عمولة ${c.status}: ${Number(c.amount).toFixed(2)} ${c.currency}`,
        title_en: `Commission ${c.status}: ${Number(c.amount).toFixed(2)} ${c.currency}`,
        link: "/commissions",
      });
    }
    activity.sort((a, b) => (a.at < b.at ? 1 : -1));

    return {
      hasCompany: true,
      company: company as any,
      subscription: { isPaid, plan: isPaid ? "premium_company" : "free", expiresAt: exp },
      profileCompletion: { pct, done, total: checklist.length },
      kpis: {
        activeProducts, activeServices, totalListings: L.length,
        totalLeads: totalLeads ?? 0, newLeads: newLeads ?? 0,
        activePromotedListings, activeCampaigns, participatingMarketers,
        referralClicks, referralConversions, conversionRate,
        totalCommissionsEgp, pendingCommissionsEgp,
      },
      checklist,
      activity: activity.slice(0, 10),
    };
  });

// ============================================================================
// Company Campaign Center — promoted listings owned by the company, with
// per-listing marketer/commission metrics.
// ============================================================================

export type CompanyCampaignRow = {
  id: string;
  title_ar: string | null;
  title_en: string | null;
  type: string;
  status: string;
  marketer_promotion_enabled: boolean;
  promotion_status: string;
  commission_type: string;
  commission_percentage: number;
  commission_fixed_amount: number;
  conversion_goal: string | null;
  promotion_conditions: string | null;
  participatingMarketers: number;
  activeCampaigns: number;
  clicks: number;
  leads: number;
  conversions: number;
  conversionRate: number;
  commissionsEgp: number;
};

export const listCompanyCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ hasCompany: boolean; rows: CompanyCampaignRow[] }> => {
    const { supabase, userId } = context;
    const { data: company } = await supabase
      .from("companies").select("id").eq("owner_id", userId).maybeSingle();
    if (!company) return { hasCompany: false, rows: [] };
    const cid = company.id;

    const { data: listings } = await supabase
      .from("listings")
      .select("id, title_ar, title_en, type, status, marketer_promotion_enabled, promotion_status, commission_type, commission_percentage, commission_fixed_amount, conversion_goal, promotion_conditions, leads_count")
      .eq("company_id", cid)
      .eq("marketer_promotion_enabled", true)
      .order("created_at", { ascending: false });
    const L = (listings ?? []) as any[];
    if (L.length === 0) return { hasCompany: true, rows: [] };
    const ids = L.map((l) => l.id);

    const [{ data: refs }, { data: camps }, { data: comms }] = await Promise.all([
      supabase.from("referrals").select("listing_id, agent_id, clicks, conversions").in("listing_id", ids),
      supabase.from("agent_campaigns").select("id, listing_id, status").in("listing_id", ids),
      supabase.from("commissions").select("listing_id, amount, status").eq("company_id", cid).in("listing_id", ids),
    ]);

    const rows: CompanyCampaignRow[] = L.map((l) => {
      const R = (refs ?? []).filter((r) => r.listing_id === l.id);
      const CA = (camps ?? []).filter((c) => c.listing_id === l.id);
      const CO = (comms ?? []).filter((c) => c.listing_id === l.id);
      const clicks = R.reduce((s, r) => s + (r.clicks ?? 0), 0);
      const conversions = R.reduce((s, r) => s + (r.conversions ?? 0), 0);
      return {
        id: l.id, title_ar: l.title_ar, title_en: l.title_en, type: l.type, status: l.status,
        marketer_promotion_enabled: !!l.marketer_promotion_enabled,
        promotion_status: l.promotion_status ?? "active",
        commission_type: l.commission_type ?? "percentage",
        commission_percentage: Number(l.commission_percentage ?? 0),
        commission_fixed_amount: Number(l.commission_fixed_amount ?? 0),
        conversion_goal: l.conversion_goal, promotion_conditions: l.promotion_conditions,
        participatingMarketers: new Set(R.map((r) => r.agent_id)).size,
        activeCampaigns: CA.filter((c) => c.status === "active").length,
        clicks, leads: Number(l.leads_count ?? 0), conversions,
        conversionRate: clicks > 0 ? Math.round((conversions / clicks) * 1000) / 10 : 0,
        commissionsEgp: CO.reduce((s, c) => s + Number(c.amount ?? 0), 0),
      };
    });
    return { hasCompany: true, rows };
  });

// Set promotion_status on a listing owned by the caller.
export const setListingPromotionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["active", "paused", "ended"]),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase.from("listings").select("id, company_id").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Listing not found");
    const { data: comp } = await supabase
      .from("companies").select("id").eq("id", row.company_id).eq("owner_id", userId).maybeSingle();
    if (!comp) throw new Error("Not authorized");
    const { error } = await supabase.from("listings").update({ promotion_status: data.status } as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
