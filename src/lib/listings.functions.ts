import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LISTING_TYPE = z.enum(["product", "service", "real_estate", "land", "factory", "opportunity"]);

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
      currency: z.string().min(2).max(8).default("USD"),
      country: z.string().max(80).optional().nullable(),
      city: z.string().max(80).optional().nullable(),
      location: z.string().max(200).optional().nullable(),
      images: z.array(z.string()).max(10).default([]),
      video_url: z.string().url().optional().nullable(),
      pdf_url: z.string().url().optional().nullable(),
      commission_percentage: z.number().min(0).max(100).default(5),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: company, error: cErr } = await supabase
      .from("companies")
      .select("id, subscription_plan")
      .eq("owner_id", userId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!company) throw new Error("Create a company profile before posting listings.");

    // Enforce free plan listing cap
    if (company.subscription_plan === "free") {
      const { count } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company.id);
      if ((count ?? 0) >= 5) throw new Error("Free plan limit reached. Upgrade to add more listings.");
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
        location: data.location,
        images: data.images,
        video_url: data.video_url,
        pdf_url: data.pdf_url,
        commission_percentage: data.commission_percentage,
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
