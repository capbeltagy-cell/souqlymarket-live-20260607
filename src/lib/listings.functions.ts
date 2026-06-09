import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LISTING_TYPE = z.enum(["product", "service", "real_estate", "land", "factory", "company", "opportunity", "market", "fish_shed"]);

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
      video_url: z.string().url().optional().nullable(),
      pdf_url: z.string().url().optional().nullable(),
      commission_percentage: z.number().min(0).max(100).default(5),
      property_subtype: z.string().max(40).optional().nullable(),
      area_sqm: z.number().nonnegative().optional().nullable(),
      bedrooms: z.number().int().nonnegative().optional().nullable(),
      bathrooms: z.number().int().nonnegative().optional().nullable(),
      purpose: z.enum(["sale", "rent"]).optional().nullable(),
      ownership_type: z.string().max(40).optional().nullable(),
      address_line: z.string().max(300).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
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
        currency: data.currency,
        country: data.country,
        city: data.city,
        governorate: data.governorate,
        location: data.location,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        images: data.images,
        video_url: data.video_url,
        pdf_url: data.pdf_url,
        commission_percentage: data.commission_percentage,
        property_subtype: data.property_subtype ?? null,
        area_sqm: data.area_sqm ?? null,
        bedrooms: data.bedrooms ?? null,
        bathrooms: data.bathrooms ?? null,
        purpose: data.purpose ?? null,
        ownership_type: data.ownership_type ?? null,
        address_line: data.address_line ?? null,
        status: "approved", // auto-approve for beta; admin can flip later
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const deleteListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("listings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
