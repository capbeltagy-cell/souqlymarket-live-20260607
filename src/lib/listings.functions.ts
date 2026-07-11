import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertNotPureMarketer } from "@/lib/marketer-guard";

const LISTING_TYPE = z.enum(["product", "service", "real_estate", "land", "factory", "company", "opportunity", "market", "fish_shed"]);
const IMAGE_SOURCE = z.enum(["live_capture", "uploaded"]);

const PHONE_RE = /^[+0-9()\-\s]{6,20}$/;

export const createListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      type: LISTING_TYPE,
      title_ar: z.string().min(2).max(200),
      title_en: z.string().min(2).max(200),
      description_ar: z.string().max(4000).optional().nullable(),
      description_en: z.string().max(4000).optional().nullable(),
      category: z.string().max(80).optional().nullable(),
      price: z.number().nonnegative().nullable(),
      currency: z.string().min(2).max(8).default("EGP"),
      country: z.string().max(80).optional().nullable().default("Egypt"),

      city: z.string().trim().min(2).max(80),
      governorate: z.string().trim().min(2).max(80),
      location: z.string().max(200).optional().nullable(),
      latitude: z.number().gte(-90).lte(90).nullable().optional(),
      longitude: z.number().gte(-180).lte(180).nullable().optional(),
      images: z.array(z.string()).max(10).default([]),
      image_sources: z.array(IMAGE_SOURCE).max(10).default([]),
      video_url: z.string().url().optional().nullable(),
      pdf_url: z.string().url().optional().nullable(),
      commission_percentage: z.number().min(0).max(100).default(5),
      marketer_promotion_enabled: z.boolean().optional().default(false),
      commission_type: z.enum(["percentage", "fixed"]).optional().default("percentage"),
      commission_fixed_amount: z.number().nonnegative().optional().default(0),
      conversion_goal: z.string().max(200).optional().nullable(),
      promotion_conditions: z.string().max(1000).optional().nullable(),
      promotion_status: z.enum(["active", "paused", "ended"]).optional().default("paused"),
      campaign_max_conversions: z.number().int().positive().optional().nullable(),
      campaign_budget_egp: z.number().positive().optional().nullable(),
      phone: z.string().trim().regex(PHONE_RE).max(20).optional().nullable(),
      whatsapp: z.string().trim().regex(PHONE_RE).max(20).optional().nullable(),
      property_subtype: z.string().max(40).optional().nullable(),
      area_sqm: z.number().nonnegative().optional().nullable(),
      bedrooms: z.number().int().nonnegative().optional().nullable(),
      bathrooms: z.number().int().nonnegative().optional().nullable(),
      purpose: z.enum(["sale", "rent"]).optional().nullable(),
      ownership_type: z.string().max(40).optional().nullable(),
      address_line: z.string().max(300).optional().nullable(),
      force: z.boolean().optional().default(false),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertNotPureMarketer(supabase as never, userId);
    const { data: company, error: cErr } = await supabase
      .from("companies")
      .select("id, subscription_plan, subscription_expires_at")
      .eq("owner_id", userId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!company) throw new Error("Create a company profile before posting listings.");

    const exp = (company as { subscription_expires_at?: string | null }).subscription_expires_at ?? null;
    const isPaid = company.subscription_plan === "premium_company" && (!exp || new Date(exp).getTime() > Date.now());

    if (!isPaid) {
      const { count } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company.id);
      if ((count ?? 0) >= 5) throw new Error("LISTING_LIMIT_REACHED");
    }

    // Duplicate detection — exact = block; similar = pending_review (unless force)
    const dup = await detectDuplicateInternal(supabase, {
      company_id: company.id,
      title_ar: data.title_ar,
      title_en: data.title_en,
      governorate: data.governorate,
      phone: data.phone ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
    });
    if (dup.severity === "exact") {
      throw new Error("DUPLICATE_EXACT");
    }
    const status = dup.severity === "similar" && !data.force ? "pending_review" : "approved";

    const { data: row, error } = await supabase
      .from("listings")
      .insert({
        company_id: company.id,
        type: data.type,
        title_ar: data.title_ar,
        title_en: data.title_en,
        description_ar: data.description_ar,
        description_en: data.description_en,
        category: data.category,
        price: data.price,
        currency: "EGP",
        country: data.country,
        city: data.city,
        governorate: data.governorate,
        location: data.location,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        images: data.images,
        image_sources: data.image_sources,
        video_url: data.video_url,
        pdf_url: data.pdf_url,
        commission_percentage: data.commission_percentage,
        marketer_promotion_enabled: data.marketer_promotion_enabled ?? false,
        commission_type: data.commission_type ?? "percentage",
        commission_fixed_amount: data.commission_fixed_amount ?? 0,
        conversion_goal: data.conversion_goal ?? null,
        promotion_conditions: data.promotion_conditions ?? null,
        promotion_status: data.marketer_promotion_enabled ? "paused" : "ended",
        campaign_max_conversions: data.campaign_max_conversions ?? null,
        campaign_budget_egp: data.campaign_budget_egp ?? null,
        phone: data.phone ?? null,
        whatsapp: data.whatsapp ?? null,
        property_subtype: data.property_subtype ?? null,
        area_sqm: data.area_sqm ?? null,
        bedrooms: data.bedrooms ?? null,
        bathrooms: data.bathrooms ?? null,
        purpose: data.purpose ?? null,
        ownership_type: data.ownership_type ?? null,
        address_line: data.address_line ?? null,
        status,
      })
      .select("id, status")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id, status: row.status as string };
  });

export const deleteListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("listings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Full owner-side edit for a listing (including marketer promotion settings).
// Ownership is enforced server-side (RLS + explicit company_id check).
export const updateListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      title_ar: z.string().min(2).max(200).optional(),
      title_en: z.string().min(2).max(200).optional(),
      description_ar: z.string().max(4000).nullable().optional(),
      description_en: z.string().max(4000).nullable().optional(),
      category: z.string().max(80).nullable().optional(),
      price: z.number().nonnegative().nullable().optional(),
      city: z.string().trim().min(2).max(80).optional(),
      governorate: z.string().trim().min(2).max(80).optional(),
      images: z.array(z.string()).max(10).optional(),
      phone: z.string().trim().regex(PHONE_RE).max(20).nullable().optional(),
      whatsapp: z.string().trim().regex(PHONE_RE).max(20).nullable().optional(),
      status: z.enum(["approved", "hidden", "pending_review"]).optional(),
      commission_percentage: z.number().min(0).max(100).optional(),
      marketer_promotion_enabled: z.boolean().optional(),
      commission_type: z.enum(["percentage", "fixed"]).optional(),
      commission_fixed_amount: z.number().nonnegative().optional(),
      conversion_goal: z.string().max(200).nullable().optional(),
      promotion_conditions: z.string().max(1000).nullable().optional(),
      promotion_status: z.enum(["active", "paused", "ended"]).optional(),
      campaign_max_conversions: z.number().int().positive().nullable().optional(),
      campaign_budget_egp: z.number().positive().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { id, ...rest } = data;
    const { data: row, error: rErr } = await supabase
      .from("listings").select("id, company_id").eq("id", id).maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!row) throw new Error("Listing not found");
    const { data: comp } = await supabase
      .from("companies").select("id").eq("id", row.company_id).eq("owner_id", userId).maybeSingle();
    if (!comp) throw new Error("Not authorized to edit this listing");
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) if (v !== undefined) patch[k] = v;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabase.from("listings").update(patch as never).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Contact reveal — masked on promoted+active listings so the public flow goes through Souqly.
export const getListingContact = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: row } = await sb
      .from("listings")
      .select("phone, whatsapp, marketer_promotion_enabled, promotion_status")
      .eq("id", data.id)
      .eq("status", "approved")
      .maybeSingle() as { data: { phone: string | null; whatsapp: string | null; marketer_promotion_enabled: boolean | null; promotion_status: string | null } | null };
    if (!row) return { phone: null, whatsapp: null, masked: false };
    const promoted = !!row.marketer_promotion_enabled && (row.promotion_status ?? "active") === "active";
    if (promoted) return { phone: null, whatsapp: null, masked: true };
    return { phone: row.phone, whatsapp: row.whatsapp, masked: false };
  });

export const checkListingDuplicate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      title_ar: z.string().min(1).max(200),
      title_en: z.string().min(1).max(200),
      governorate: z.string().min(1).max(80),
      phone: z.string().max(20).optional().nullable(),
      latitude: z.number().optional().nullable(),
      longitude: z.number().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: company } = await supabase
      .from("companies").select("id").eq("owner_id", userId).maybeSingle();
    return detectDuplicateInternal(supabase, {
      company_id: company?.id ?? null,
      title_ar: data.title_ar,
      title_en: data.title_en,
      governorate: data.governorate,
      phone: data.phone ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
    });
  });

type DupInput = {
  company_id: string | null;
  title_ar: string;
  title_en: string;
  governorate: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
};

async function detectDuplicateInternal(
  supabase: unknown,
  input: DupInput,
): Promise<{ severity: "none" | "similar" | "exact"; count: number }> {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
  const sb = supabase as {
    from: (t: string) => {
      select: (s: string) => {
        gte: (c: string, v: string) => Promise<{ data: Array<Record<string, unknown>> | null }>;
      };
    };
  };
  const { data } = await sb.from("listings")
    .select("id, title_ar, title_en, governorate, phone, latitude, longitude, company_id, created_at")
    .gte("created_at", since);
  const rows = (data ?? []) as Array<{
    id: string; title_ar: string | null; title_en: string | null;
    governorate: string | null; phone: string | null;
    latitude: number | null; longitude: number | null;
    company_id: string | null;
  }>;
  const norm = (s: string | null) => (s ?? "").toLowerCase().trim();
  const titleAr = norm(input.title_ar);
  const titleEn = norm(input.title_en);
  const gov = norm(input.governorate);
  let severity: "none" | "similar" | "exact" = "none";
  let count = 0;
  for (const r of rows) {
    if (r.company_id && input.company_id && r.company_id === input.company_id) continue;
    const sameTitle = norm(r.title_ar) === titleAr || norm(r.title_en) === titleEn;
    const sameGov = norm(r.governorate) === gov;
    const samePhone = !!input.phone && !!r.phone && r.phone.replace(/\D/g, "") === input.phone.replace(/\D/g, "");
    const sameCoord = input.latitude != null && input.longitude != null && r.latitude != null && r.longitude != null
      && Math.abs(r.latitude - input.latitude) < 0.0005 && Math.abs(r.longitude - input.longitude) < 0.0005;
    if (sameTitle && sameGov && (samePhone || sameCoord)) {
      severity = "exact";
      count++;
    } else if ((sameTitle && sameGov) || samePhone || sameCoord) {
      if (severity !== "exact") severity = "similar";
      count++;
    }
  }
  return { severity, count };
}
