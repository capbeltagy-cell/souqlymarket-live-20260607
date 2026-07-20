import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{2,48}[a-z0-9])$/;
const STATUS = z.enum(["draft", "pending_review", "published", "suspended", "rejected"]);

const storeSchema = z.object({
  name_ar: z.string().min(2).max(120),
  name_en: z.string().max(120).optional().nullable(),
  slug: z.string().regex(SLUG_RE, "slug صالح فقط: أحرف/أرقام/شرطة"),
  description_ar: z.string().max(2000).optional().nullable(),
  description_en: z.string().max(2000).optional().nullable(),
  business_type: z.string().max(80).optional().nullable(),
  logo_url: z.string().url().optional().nullable(),
  banner_url: z.string().url().optional().nullable(),
  colors: z.record(z.string(), z.string()).default({}),
  city: z.string().max(120).optional().nullable(),
  governorate: z.string().max(120).optional().nullable(),
  shipping_policy: z.string().max(4000).optional().nullable(),
  return_policy: z.string().max(4000).optional().nullable(),
  socials: z.record(z.string(), z.string()).default({}),
  business_hours: z.record(z.string(), z.any()).default({}),
  company_id: z.string().uuid().optional().nullable(),
});

export const createStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => storeSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: existing } = await (supabase.from("stores" as never) as any)
      .select("id").eq("owner_id", userId).maybeSingle();
    if (existing) throw new Error("لديك متجر بالفعل");
    const { data: dup } = await (supabase.from("stores" as never) as any)
      .select("id").eq("slug", data.slug).maybeSingle();
    if (dup) throw new Error("هذا الرابط مستخدم بالفعل");
    const { data: inserted, error } = await (supabase.from("stores" as never) as any)
      .insert({ ...data, owner_id: userId, status: "draft" })
      .select("id, slug").single();
    if (error) throw new Error(error.message);
    return inserted as { id: string; slug: string };
  });

export const updateStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => storeSchema.partial().extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { id, ...rest } = data;
    const { error } = await (supabase.from("stores" as never) as any).update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitStoreForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: store } = await (supabase.from("stores" as never) as any)
      .select("id, owner_id, name_ar, slug, logo_url").eq("id", data.id).maybeSingle();
    if (!store || store.owner_id !== userId) throw new Error("غير مسموح");
    if (!store.name_ar || !store.slug) throw new Error("أكمل بيانات المتجر أولًا");
    const { error } = await (supabase.from("stores" as never) as any)
      .update({ status: "pending_review" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyStore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await (supabase.from("stores" as never) as any)
      .select("*").eq("owner_id", userId).maybeSingle();
    return { store: data ?? null };
  });

export const listPublicStores = createServerFn({ method: "GET" })
  .handler(async () => {
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const s = createClient<Database>(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data } = await (s.from("stores" as never) as any)
      .select("id, slug, name_ar, name_en, logo_url, banner_url, city, governorate, is_verified, is_featured, followers_count, products_count, review_avg, review_count")
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("review_avg", { ascending: false })
      .limit(120);
    return { items: (data ?? []) as any[] };
  });

export const getStoreBySlug = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const s = createClient<Database>(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: store } = await (s.from("stores" as never) as any)
      .select("*").eq("slug", data.slug).eq("status", "published").maybeSingle();
    if (!store) return { store: null, categories: [], listings: [], reviews: [] };
    const [cats, lst, rev] = await Promise.all([
      (s.from("store_categories" as never) as any).select("*").eq("store_id", store.id).order("sort_order"),
      s.from("listings").select("id, title_ar, title_en, price, currency, images, sale_price, store_category_id, featured")
        .eq("store_id", store.id).eq("status", "approved").eq("visible_in_store", true).limit(60),
      (s.from("store_reviews" as never) as any)
        .select("id, rating, body, seller_reply, user_id, created_at")
        .eq("store_id", store.id).eq("status", "published").order("created_at", { ascending: false }).limit(30),
    ]);
    return {
      store,
      categories: cats.data ?? [],
      listings: lst.data ?? [],
      reviews: rev.data ?? [],
    };
  });

export const followStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ store_id: z.string().uuid(), follow: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (data.follow) {
      const { error } = await (supabase.from("store_followers" as never) as any)
        .insert({ store_id: data.store_id, user_id: userId });
      if (error && error.code !== "23505") throw new Error(error.message);
    } else {
      await (supabase.from("store_followers" as never) as any)
        .delete().eq("store_id", data.store_id).eq("user_id", userId);
    }
    return { ok: true };
  });

export const listStoreOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ store_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: store } = await (supabase.from("stores" as never) as any)
      .select("id, owner_id").eq("id", data.store_id).maybeSingle();
    if (!store || store.owner_id !== userId) throw new Error("غير مسموح");
    const { data: orders } = await (supabase.from("wholesale_orders" as never) as any)
      .select("*").eq("store_id", data.store_id).order("created_at", { ascending: false }).limit(200);
    return { items: orders ?? [] };
  });

export const getStoreAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ store_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: store } = await (supabase.from("stores" as never) as any)
      .select("id, owner_id").eq("id", data.store_id).maybeSingle();
    if (!store || store.owner_id !== userId) throw new Error("غير مسموح");
    const { data: orders } = await (supabase.from("wholesale_orders" as never) as any)
      .select("status, payment_status, total_amount, created_at").eq("store_id", data.store_id).limit(2000);
    const { count: productsCount } = await supabase.from("listings")
      .select("id", { count: "exact", head: true }).eq("store_id", data.store_id);
    const orders_ = (orders ?? []) as Array<{ status: string; payment_status: string; total_amount: number; created_at: string }>;
    const paid = orders_.filter((o) => o.payment_status === "paid");
    const totalSales = paid.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    return {
      totals: {
        orders: orders_.length,
        paidOrders: paid.length,
        totalSales,
        averageOrder: paid.length ? totalSales / paid.length : 0,
        products: productsCount ?? 0,
      },
    };
  });
