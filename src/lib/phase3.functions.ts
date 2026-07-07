import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCityVariants, getGovernorateVariants } from "@/lib/egypt.locations";
import { assertNotPureMarketer } from "@/lib/marketer-guard";

/* eslint-disable @typescript-eslint/no-explicit-any */
const T = (s: string) => s as any; // bypass generated types for new tables

// =========================================================================
// RFQs
// =========================================================================
export const createRfq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      title: z.string().trim().min(3).max(200),
      description: z.string().trim().max(4000).optional().or(z.literal("")).transform((v) => v || undefined),
      category_slug: z.string().trim().min(1).max(60).optional().or(z.literal("")).transform((v) => v || undefined),
      quantity: z.number().int().positive().optional(),
      unit: z.string().trim().max(40).optional().or(z.literal("")).transform((v) => v || undefined),
      budget_min: z.number().nonnegative().optional(),
      budget_max: z.number().nonnegative().optional(),
      governorate: z.string().trim().max(80).optional().or(z.literal("")).transform((v) => v || undefined),
      attachments: z.array(z.object({ name: z.string().max(255), url: z.string().url().max(2048) })).max(10).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertNotPureMarketer(supabase as never, userId);
    const { data: row, error } = await supabase.from(T("rfqs")).insert({
      buyer_id: userId,
      title: data.title,
      description: data.description ?? null,
      category_slug: data.category_slug ?? null,
      quantity: data.quantity ?? null,
      unit: data.unit ?? null,
      budget_min: data.budget_min ?? null,
      budget_max: data.budget_max ?? null,
      governorate: data.governorate ?? null,
      attachments: data.attachments ?? [],
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id as string };
  });

export const listRfqs = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      category_slug: z.string().max(60).optional(),
      governorate: z.string().max(80).optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Public projection only — exclude buyer_id and attachments; only open RFQs.
    let q = supabaseAdmin.from(T("rfqs"))
      .select("id, title, description, category_slug, quantity, unit, budget_min, budget_max, governorate, status, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false }).limit(200);
    if (data.category_slug) q = q.eq("category_slug", data.category_slug);
    if (data.governorate) q = q.eq("governorate", data.governorate);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rfqs: (rows ?? []) as any[] };
  });

export const getRfq = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rfq } = await supabaseAdmin.from(T("rfqs"))
      .select("id, title, description, category_slug, quantity, unit, budget_min, budget_max, governorate, status, created_at")
      .eq("id", data.id).eq("status", "open").maybeSingle();
    if (!rfq) throw new Error("RFQ not found");
    return { rfq };
  });

export const getMyRfqs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from(T("rfqs"))
      .select("*").eq("buyer_id", context.userId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rfqs: (data ?? []) as any[] };
  });

export const listRfqOffers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ rfqId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase.from(T("rfq_offers"))
      .select("*, companies(id, name_ar, name_en, logo_url, is_verified)")
      .eq("rfq_id", data.rfqId)
      .order("price", { ascending: true });
    if (error) throw new Error(error.message);
    return { offers: (rows ?? []) as any[] };
  });

export const submitRfqOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      rfqId: z.string().uuid(),
      price: z.number().positive(),
      currency: z.string().max(8).default("EGP"),
      lead_time_days: z.number().int().nonnegative().optional(),
      notes: z.string().max(2000).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: c } = await supabase.from("companies").select("id").eq("owner_id", userId).maybeSingle();
    if (!c) throw new Error("Only companies can submit offers");
    const { error } = await supabase.from(T("rfq_offers")).insert({
      rfq_id: data.rfqId,
      company_id: c.id,
      price: data.price,
      currency: data.currency,
      lead_time_days: data.lead_time_days ?? null,
      notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const awardRfq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ rfqId: z.string().uuid(), offerId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: rfq } = await supabase.from(T("rfqs")).select("buyer_id").eq("id", data.rfqId).maybeSingle();
    if (!rfq || (rfq as any).buyer_id !== userId) throw new Error("Forbidden");
    await supabase.from(T("rfq_offers")).update({ status: "rejected" }).eq("rfq_id", data.rfqId);
    await supabase.from(T("rfq_offers")).update({ status: "accepted" }).eq("id", data.offerId);
    const { error } = await supabase.from(T("rfqs"))
      .update({ status: "awarded", winner_offer_id: data.offerId }).eq("id", data.rfqId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =========================================================================
// Wholesale
// =========================================================================
export const listWholesale = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      category_slug: z.string().max(60).optional(),
      governorate: z.string().max(80).optional(),
      q: z.string().max(200).optional(),
      kind: z.enum(["product", "storage"]).optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from(T("wholesale_listings"))
      .select("*, companies(id, name_ar, name_en, is_verified)")
      .eq("active", true).order("created_at", { ascending: false }).limit(200);
    if (data.category_slug) q = q.eq("category_slug", data.category_slug);
    if (data.governorate) q = q.eq("governorate", data.governorate);
    if (data.kind) q = q.eq("kind", data.kind);
    if (data.q) q = q.ilike("title", `%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: (rows ?? []) as any[] };
  });


export const getWholesale = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Do not expose company phone to anonymous visitors.
    const { data: row } = await supabaseAdmin.from(T("wholesale_listings"))
      .select("*, companies(id, name_ar, name_en, logo_url, is_verified)")
      .eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Not found");
    return { item: row };
  });

export const createWholesale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      title: z.string().trim().min(3).max(200),
      description: z.string().trim().max(4000).optional(),
      category_slug: z.string().max(60).optional(),
      moq: z.number().int().positive(),
      price_per_unit: z.number().positive().optional(),
      governorate: z.string().max(80).optional(),
      images: z.array(z.string().url().max(2048)).max(10).optional(),
      kind: z.enum(["product", "storage"]).optional(),
      unit: z.string().trim().max(40).optional(),
      wholesale_price: z.number().positive().optional(),
      available_quantity: z.number().int().nonnegative().optional(),
      city: z.string().max(80).optional(),
      delivery_available: z.boolean().optional(),
      shipping_available: z.boolean().optional(),
      attributes: z.record(z.string(), z.any()).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertNotPureMarketer(supabase as never, userId);
    const { data: c } = await supabase.from("companies").select("id").eq("owner_id", userId).maybeSingle();
    if (!c) throw new Error("Create a company first");
    const { data: row, error } = await supabase.from(T("wholesale_listings")).insert({
      company_id: c.id,
      title: data.title,
      description: data.description ?? null,
      category_slug: data.category_slug ?? null,
      moq: data.moq,
      price_per_unit: data.price_per_unit ?? null,
      governorate: data.governorate ?? null,
      images: data.images ?? [],
      kind: data.kind ?? "product",
      unit: data.unit ?? null,
      wholesale_price: data.wholesale_price ?? null,
      available_quantity: data.available_quantity ?? null,
      city: data.city ?? null,
      delivery_available: data.delivery_available ?? false,
      shipping_available: data.shipping_available ?? false,
      attributes: data.attributes ?? {},
    } as never).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id };
  });


export const submitWholesaleOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      listingId: z.string().uuid(),
      quantity: z.number().int().positive(),
      contact_phone: z.string().max(40).optional(),
      notes: z.string().max(2000).optional(),
      referral_code: z.string().min(4).max(32).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from(T("wholesale_orders")).insert({
      buyer_id: context.userId,
      listing_id: data.listingId,
      quantity: data.quantity,
      contact_phone: data.contact_phone ?? null,
      notes: data.notes ?? null,
      referral_code: data.referral_code ?? null,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


// =========================================================================
// Factories
// =========================================================================
export const listFactories = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      governorate: z.string().max(80).optional(),
      export_available: z.boolean().optional(),
      verified: z.boolean().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from(T("factories"))
      .select("*, companies(id, name_ar, name_en, logo_url, is_verified, country, city, industry, governorate)")
      .limit(200);
    if (typeof data.export_available === "boolean") q = q.eq("export_available", data.export_available);
    if (typeof data.verified === "boolean") q = q.eq("verified", data.verified);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let list = (rows ?? []) as any[];
    if (data.governorate) list = list.filter((r) => r.companies?.governorate === data.governorate);
    return { factories: list };
  });

export const upsertMyFactory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      production_capacity: z.string().max(200).optional(),
      employees_range: z.string().max(80).optional(),
      export_available: z.boolean().default(false),
      certifications: z.array(z.string().max(200)).max(20).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertNotPureMarketer(supabase as never, userId);
    const { data: c } = await supabase.from("companies").select("id").eq("owner_id", userId).maybeSingle();
    if (!c) throw new Error("Create a company first");
    const { error } = await supabase.from(T("factories")).upsert({
      company_id: c.id,
      production_capacity: data.production_capacity ?? null,
      employees_range: data.employees_range ?? null,
      export_available: data.export_available,
      certifications: data.certifications ?? [],
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminVerifyFactory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid(), verified: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase.from(T("factories"))
      .update({ verified: data.verified }).eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =========================================================================
// Tenders
// =========================================================================
export const createTender = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      title: z.string().trim().min(3).max(200),
      description: z.string().trim().max(8000).optional(),
      category_slug: z.string().max(60).optional(),
      governorate: z.string().max(80).optional(),
      budget: z.number().nonnegative().optional(),
      deadline: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertNotPureMarketer(context.supabase as never, context.userId);
    const { data: row, error } = await context.supabase.from(T("tenders")).insert({
      publisher_id: context.userId,
      title: data.title,
      description: data.description ?? null,
      category_slug: data.category_slug ?? null,
      governorate: data.governorate ?? null,
      budget: data.budget ?? null,
      deadline: data.deadline ?? null,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id };
  });

export const listTenders = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      category_slug: z.string().max(60).optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Public projection — only open tenders, exclude publisher_id.
    let q = supabaseAdmin.from(T("tenders"))
      .select("id, title, description, category_slug, governorate, budget, deadline, status, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false }).limit(200);
    if (data.category_slug) q = q.eq("category_slug", data.category_slug);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { tenders: (rows ?? []) as any[] };
  });

export const getTender = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from(T("tenders"))
      .select("id, title, description, category_slug, governorate, budget, deadline, status, created_at")
      .eq("id", data.id).eq("status", "open").maybeSingle();
    if (!row) throw new Error("Not found");
    return { tender: row };
  });

export const getMyTenders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from(T("tenders"))
      .select("*").eq("publisher_id", context.userId).order("created_at", { ascending: false });
    return { tenders: (data ?? []) as any[] };
  });

export const submitTenderProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenderId: z.string().uuid(),
      price: z.number().positive(),
      timeline_days: z.number().int().nonnegative().optional(),
      notes: z.string().max(4000).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: c } = await context.supabase.from("companies").select("id").eq("owner_id", context.userId).maybeSingle();
    if (!c) throw new Error("Only companies can submit proposals");
    const { error } = await context.supabase.from(T("tender_proposals")).insert({
      tender_id: data.tenderId,
      company_id: c.id,
      price: data.price,
      timeline_days: data.timeline_days ?? null,
      notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listTenderProposals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenderId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase.from(T("tender_proposals"))
      .select("*, companies(id, name_ar, name_en, is_verified)")
      .eq("tender_id", data.tenderId).order("price", { ascending: true });
    if (error) throw new Error(error.message);
    return { proposals: (rows ?? []) as any[] };
  });

export const awardTender = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenderId: z.string().uuid(), proposalId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: t } = await context.supabase.from(T("tenders")).select("publisher_id").eq("id", data.tenderId).maybeSingle();
    if (!t || (t as any).publisher_id !== context.userId) throw new Error("Forbidden");
    await context.supabase.from(T("tender_proposals")).update({ status: "rejected" }).eq("tender_id", data.tenderId);
    await context.supabase.from(T("tender_proposals")).update({ status: "accepted" }).eq("id", data.proposalId);
    await context.supabase.from(T("tenders")).update({ status: "awarded", winner_proposal_id: data.proposalId }).eq("id", data.tenderId);
    return { ok: true };
  });

// =========================================================================
// Categories
// =========================================================================
export const listCategories = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from(T("business_categories")).select("*").order("sort");
    return { categories: ((data ?? []) as unknown) as { slug: string; name_ar: string; name_en: string; icon: string | null; sort: number }[] };
  });

// =========================================================================
// Company profile extra
// =========================================================================
export const getCompanyProfileExtra = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Public projection only — exclude whatsapp (contact detail).
    const { data: row } = await supabaseAdmin.from(T("company_profiles_extra"))
      .select("company_id, cover_url, website, achievements, catalog_pdfs, gallery, downloads_count")
      .eq("company_id", data.companyId).maybeSingle();
    return { extra: row as any };
  });

export const upsertMyCompanyProfileExtra = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      cover_url: z.string().url().max(2048).optional().or(z.literal("")).transform((v) => v || undefined),
      whatsapp: z.string().max(40).optional().or(z.literal("")).transform((v) => v || undefined),
      website: z.string().url().max(2048).optional().or(z.literal("")).transform((v) => v || undefined),
      achievements: z.array(z.string().max(300)).max(20).optional(),
      catalog_pdfs: z.array(z.object({ name: z.string().max(200), url: z.string().url().max(2048) })).max(10).optional(),
      gallery: z.array(z.string().url().max(2048)).max(30).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: c } = await supabase.from("companies").select("id").eq("owner_id", userId).maybeSingle();
    if (!c) throw new Error("Create a company first");
    const { error } = await supabase.from(T("company_profiles_extra")).upsert({
      company_id: c.id,
      cover_url: data.cover_url ?? null,
      whatsapp: data.whatsapp ?? null,
      website: data.website ?? null,
      achievements: data.achievements ?? [],
      catalog_pdfs: data.catalog_pdfs ?? [],
      gallery: data.gallery ?? [],
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const incrementCatalogDownload = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from(T("company_profiles_extra"))
      .select("downloads_count").eq("company_id", data.companyId).maybeSingle();
    const next = ((row as any)?.downloads_count ?? 0) + 1;
    await supabaseAdmin.from(T("company_profiles_extra"))
      .upsert({ company_id: data.companyId, downloads_count: next });
    return { downloads: next };
  });

// =========================================================================
// Referral Program (company / user level)
// =========================================================================
function makeCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export const getMyReferral = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    let { data: row } = await supabase.from(T("company_referrals"))
      .select("*").eq("owner_user_id", userId).maybeSingle();
    if (!row) {
      const code = makeCode();
      const { data: created, error } = await supabase.from(T("company_referrals"))
        .insert({ owner_user_id: userId, code }).select("*").single();
      if (error) throw new Error(error.message);
      row = created;
    }
    return { referral: row as any };
  });

export const trackReferralClick = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ code: z.string().min(4).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from(T("company_referrals"))
      .select("clicks").eq("code", data.code).maybeSingle();
    if (!row) return { ok: false };
    await supabaseAdmin.from(T("company_referrals"))
      .update({ clicks: ((row as any).clicks ?? 0) + 1 }).eq("code", data.code);
    return { ok: true };
  });

// =========================================================================
// Advanced Search
// =========================================================================
export const advancedSearchCompanies = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      q: z.string().max(200).optional(),
      city: z.string().max(80).optional(),
      governorate: z.string().max(80).optional(),
      category_slug: z.string().max(60).optional(),
      company_type: z.string().max(40).optional(),
      verified: z.boolean().optional(),
      plan: z.enum(["free", "paid"]).optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("companies").select("id, name_ar, name_en, logo_url, cover_url, industry, city, governorate, country, company_type, category_slug, is_verified, is_premium, subscription_plan, subscription_expires_at, export_available, production_capacity, description_ar, description_en, created_at").limit(200);
    if (data.q) q = q.or(`name_ar.ilike.%${data.q}%,name_en.ilike.%${data.q}%`);
    if (data.city) {
      const cityValues = getCityVariants(data.city);
      if (cityValues.length === 1) q = q.eq("city", cityValues[0]);
      else q = q.in("city", cityValues);
    }
    if (data.governorate) {
      const governorateValues = getGovernorateVariants(data.governorate);
      if (governorateValues.length === 1) q = q.eq("governorate", governorateValues[0]);
      else q = q.in("governorate", governorateValues);
    }
    if (data.category_slug) q = q.eq("category_slug", data.category_slug);
    if (data.company_type) q = q.eq("company_type", data.company_type);
    if (typeof data.verified === "boolean") q = q.eq("is_verified", data.verified);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let list = (rows ?? []) as any[];
    if (data.plan) {
      const now = Date.now();
      list = list.filter((r) => {
        const isPaid = r.subscription_plan === "paid" && (!r.subscription_expires_at || new Date(r.subscription_expires_at).getTime() > now);
        return data.plan === "paid" ? isPaid : !isPaid;
      });
    }
    return { companies: list };
  });

// =========================================================================
// Admin Overview Stats
// =========================================================================
export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const [companies, leads, rfqs, tenders, refs, payments] = await Promise.all([
      supabaseAdmin.from("companies").select("id, subscription_plan, subscription_expires_at"),
      supabaseAdmin.from("leads").select("id", { count: "exact", head: true }),
      supabaseAdmin.from(T("rfqs")).select("id", { count: "exact", head: true }),
      supabaseAdmin.from(T("tenders")).select("id", { count: "exact", head: true }),
      supabaseAdmin.from(T("company_referrals")).select("clicks, signups, conversions"),
      supabaseAdmin.from("payments").select("amount, currency, status"),
    ]);
    const cs = (companies.data ?? []) as any[];
    const paid = cs.filter((c) => c.subscription_plan === "paid" && (!c.subscription_expires_at || c.subscription_expires_at > now)).length;
    const refRows = (refs.data ?? []) as any[];
    const refTotals = refRows.reduce((a, r) => ({
      clicks: a.clicks + (r.clicks ?? 0),
      signups: a.signups + (r.signups ?? 0),
      conversions: a.conversions + (r.conversions ?? 0),
    }), { clicks: 0, signups: 0, conversions: 0 });
    const payRows = (payments.data ?? []) as any[];
    const revenue = payRows.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount ?? 0), 0);
    const pendingRevenue = payRows.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount ?? 0), 0);
    return {
      totals: {
        companies: cs.length,
        paidCompanies: paid,
        freeCompanies: cs.length - paid,
        leads: leads.count ?? 0,
        rfqs: rfqs.count ?? 0,
        tenders: tenders.count ?? 0,
      },
      referrals: refTotals,
      revenue: { paid: revenue, pending: pendingRevenue, currency: "EGP" },
    };
  });
