import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugSchema = z.string().trim().toLowerCase().min(2).max(60).regex(/^[a-z0-9][a-z0-9-]*$/);

async function getOwnedStore(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("stores")
    .select("id,company_id,status")
    .eq("company_id", supabase.from("companies").select("id").eq("owner_id", userId))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data as { id: string; company_id: string; status: string };

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  if (companyError) throw new Error(companyError.message);
  if (!company) throw new Error("Create a company profile first.");

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id,company_id,status")
    .eq("company_id", company.id)
    .maybeSingle();
  if (storeError) throw new Error(storeError.message);
  if (!store) throw new Error("Create your store first.");
  return store as { id: string; company_id: string; status: string };
}

export const getMyStoreCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const store = await getOwnedStore(context.supabase, context.userId);
    const [{ data: categories, error: cError }, { data: listings, error: lError }, { data: settings, error: sError }] = await Promise.all([
      context.supabase.from("store_categories").select("id,name_ar,name_en,slug,sort_order,is_active").eq("store_id", store.id).order("sort_order"),
      context.supabase.from("listings").select("id,title_ar,title_en,price,currency,images,status").eq("company_id", store.company_id).eq("status", "approved").order("created_at", { ascending: false }),
      context.supabase.from("store_listing_settings").select("listing_id,category_id,is_featured,sort_order,is_visible").eq("store_id", store.id),
    ]);
    if (cError) throw new Error(cError.message);
    if (lError) throw new Error(lError.message);
    if (sError) throw new Error(sError.message);
    return { store, categories: categories ?? [], listings: listings ?? [], settings: settings ?? [] };
  });

export const saveStoreCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    id: z.string().uuid().optional(),
    name_ar: z.string().trim().min(2).max(80),
    name_en: z.string().trim().max(80).optional().nullable(),
    slug: slugSchema,
    sort_order: z.number().int().min(0).max(999).default(0),
    is_active: z.boolean().default(true),
  }).parse(value))
  .handler(async ({ context, data }) => {
    const store = await getOwnedStore(context.supabase, context.userId);
    const payload = { store_id: store.id, name_ar: data.name_ar, name_en: data.name_en ?? null, slug: data.slug, sort_order: data.sort_order, is_active: data.is_active };
    const query = data.id
      ? context.supabase.from("store_categories").update(payload).eq("id", data.id).eq("store_id", store.id)
      : context.supabase.from("store_categories").insert(payload);
    const { data: row, error } = await query.select("id").single();
    if (error) {
      if (error.code === "23505") throw new Error("CATEGORY_SLUG_TAKEN");
      throw new Error(error.message);
    }
    return row;
  });

export const deleteStoreCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ id: z.string().uuid() }).parse(value))
  .handler(async ({ context, data }) => {
    const store = await getOwnedStore(context.supabase, context.userId);
    const { error } = await context.supabase.from("store_categories").delete().eq("id", data.id).eq("store_id", store.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveStoreListingSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    listing_id: z.string().uuid(),
    category_id: z.string().uuid().optional().nullable(),
    is_featured: z.boolean().default(false),
    sort_order: z.number().int().min(0).max(999).default(0),
    is_visible: z.boolean().default(true),
  }).parse(value))
  .handler(async ({ context, data }) => {
    const store = await getOwnedStore(context.supabase, context.userId);
    const { data: listing, error: listingError } = await context.supabase
      .from("listings").select("id").eq("id", data.listing_id).eq("company_id", store.company_id).maybeSingle();
    if (listingError) throw new Error(listingError.message);
    if (!listing) throw new Error("Listing not found");

    const { error } = await context.supabase.from("store_listing_settings").upsert({
      store_id: store.id,
      listing_id: data.listing_id,
      category_id: data.category_id ?? null,
      is_featured: data.is_featured,
      sort_order: data.sort_order,
      is_visible: data.is_visible,
    }, { onConflict: "store_id,listing_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
