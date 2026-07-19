import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(50)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Use English letters, numbers, and dashes only");

const storeInput = z.object({
  slug: slugSchema,
  name_ar: z.string().trim().min(2).max(120),
  name_en: z.string().trim().max(120).optional().nullable(),
  description_ar: z.string().trim().max(2000).optional().nullable(),
  description_en: z.string().trim().max(2000).optional().nullable(),
  logo_url: z.string().url().optional().nullable(),
  banner_url: z.string().url().optional().nullable(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#0f766e"),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#f59e0b"),
  contact_phone: z.string().trim().max(20).optional().nullable(),
  whatsapp: z.string().trim().max(20).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  governorate: z.string().trim().max(80).optional().nullable(),
  shipping_policy: z.string().trim().max(3000).optional().nullable(),
  return_policy: z.string().trim().max(3000).optional().nullable(),
});

async function getOwnedCompany(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Create a company profile before opening a store.");
  return data as { id: string };
}

export const getMyStore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const company = await getOwnedCompany(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("stores")
      .select("*")
      .eq("company_id", company.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const saveMyStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => storeInput.parse(value))
  .handler(async ({ context, data }) => {
    const company = await getOwnedCompany(context.supabase, context.userId);
    const { data: existing, error: existingError } = await context.supabase
      .from("stores")
      .select("id,status")
      .eq("company_id", company.id)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);

    const payload = {
      ...data,
      company_id: company.id,
      status: existing?.status === "published" ? "published" : "pending_review",
    };

    const query = existing
      ? context.supabase.from("stores").update(payload).eq("id", existing.id)
      : context.supabase.from("stores").insert(payload);

    const { data: saved, error } = await query.select("id,slug,status").single();
    if (error) {
      if (error.code === "23505") throw new Error("STORE_SLUG_TAKEN");
      throw new Error(error.message);
    }
    return saved;
  });

export const getPublicStore = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) => z.object({ slug: slugSchema }).parse(value))
  .handler(async ({ context, data }) => {
    const { data: store, error } = await context.supabase
      .from("stores")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!store) return null;

    const { data: listings, error: listingsError } = await context.supabase
      .from("listings")
      .select("id,title_ar,title_en,description_ar,description_en,price,currency,images,category,city,governorate,stock_quantity,track_inventory")
      .eq("company_id", store.company_id)
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (listingsError) throw new Error(listingsError.message);

    return { store, listings: listings ?? [] };
  });
