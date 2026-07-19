import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugSchema = z.string().trim().toLowerCase().min(3).max(50).regex(/^[a-z0-9][a-z0-9-]*$/, "Use English letters, numbers, and dashes only");

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
  const { data, error } = await supabase.from("companies").select("id").eq("owner_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Create a company profile before opening a store.");
  return data as { id: string };
}

async function requireAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("ADMIN_ONLY");
}

export const getMyStore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const company = await getOwnedCompany(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("stores").select("*").eq("company_id", company.id).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const saveMyStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => storeInput.parse(value))
  .handler(async ({ context, data }) => {
    const company = await getOwnedCompany(context.supabase, context.userId);
    const { data: existing, error: existingError } = await context.supabase.from("stores").select("id,status").eq("company_id", company.id).maybeSingle();
    if (existingError) throw new Error(existingError.message);
    const payload = { ...data, company_id: company.id, status: existing?.status === "published" ? "published" : "pending_review" };
    const query = existing ? context.supabase.from("stores").update(payload).eq("id", existing.id) : context.supabase.from("stores").insert(payload);
    const { data: saved, error } = await query.select("id,slug,status").single();
    if (error) {
      if (error.code === "23505") throw new Error("STORE_SLUG_TAKEN");
      throw new Error(error.message);
    }
    return saved;
  });

export const listPublishedStores = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) => z.object({ search: z.string().trim().max(120).optional().default(""), limit: z.number().int().min(1).max(60).optional().default(24) }).parse(value ?? {}))
  .handler(async ({ context, data }) => {
    let query = context.supabase
      .from("stores")
      .select("id,slug,name_ar,name_en,description_ar,description_en,logo_url,banner_url,primary_color,accent_color,city,governorate,verified,featured,created_at")
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.search) {
      const safe = data.search.replace(/[,%()]/g, " ").trim();
      if (safe) query = query.or(`name_ar.ilike.%${safe}%,name_en.ilike.%${safe}%,city.ilike.%${safe}%,governorate.ilike.%${safe}%`);
    }
    const { data: stores, error } = await query;
    if (error) throw new Error(error.message);
    return stores ?? [];
  });

export const getPublicStore = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) => z.object({ slug: slugSchema }).parse(value))
  .handler(async ({ context, data }) => {
    const { data: store, error } = await context.supabase.from("stores").select("*").eq("slug", data.slug).eq("status", "published").maybeSingle();
    if (error) throw new Error(error.message);
    if (!store) return null;

    const [{ data: listings, error: listingsError }, { data: categories, error: categoriesError }, { data: settings, error: settingsError }] = await Promise.all([
      context.supabase.from("listings").select("id,title_ar,title_en,description_ar,description_en,price,currency,images,category,city,governorate,stock_quantity,track_inventory,created_at").eq("company_id", store.company_id).eq("status", "approved").order("created_at", { ascending: false }),
      context.supabase.from("store_categories").select("id,name_ar,name_en,slug,sort_order").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
      context.supabase.from("store_listing_settings").select("listing_id,category_id,is_featured,sort_order,is_visible").eq("store_id", store.id).eq("is_visible", true),
    ]);
    if (listingsError) throw new Error(listingsError.message);
    if (categoriesError) throw new Error(categoriesError.message);
    if (settingsError) throw new Error(settingsError.message);

    const settingMap = new Map((settings ?? []).map((row: any) => [row.listing_id, row]));
    const visibleListings = (listings ?? [])
      .filter((row: any) => !settingMap.has(row.id) || settingMap.get(row.id)?.is_visible !== false)
      .map((row: any) => ({ ...row, store_category_id: settingMap.get(row.id)?.category_id ?? null, is_featured: settingMap.get(row.id)?.is_featured ?? false, store_sort_order: settingMap.get(row.id)?.sort_order ?? 0 }))
      .sort((a: any, b: any) => Number(b.is_featured) - Number(a.is_featured) || a.store_sort_order - b.store_sort_order || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { store, categories: categories ?? [], listings: visibleListings };
  });

export const listAdminStores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("stores").select("id,company_id,slug,name_ar,name_en,logo_url,city,governorate,status,verified,featured,created_at,updated_at").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const moderateStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["draft", "pending_review", "published", "suspended"]), verified: z.boolean().optional(), featured: z.boolean().optional() }).parse(value))
  .handler(async ({ context, data }) => {
    await requireAdmin(context.supabase, context.userId);
    const patch: Record<string, unknown> = { status: data.status, published_at: data.status === "published" ? new Date().toISOString() : null };
    if (data.verified !== undefined) patch.verified = data.verified;
    if (data.featured !== undefined) patch.featured = data.featured;
    const { data: row, error } = await context.supabase.from("stores").update(patch).eq("id", data.id).select("id,status,verified,featured").single();
    if (error) throw new Error(error.message);
    return row;
  });
