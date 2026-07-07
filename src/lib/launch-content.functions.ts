import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LAUNCH_COMPANY_NAME_AR = "سوقلي للمحتوى التجريبي";
const LAUNCH_COMPANY_NAME_EN = "Souqly Launch Content";

type Ctx = { supabase: any; userId: string };

async function assertAdmin({ supabase, userId }: Ctx) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

async function ensureLaunchCompany({ supabase, userId }: Ctx): Promise<string> {
  const { data: existing } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", userId)
    .eq("is_system", true)
    .maybeSingle();
  if (existing?.id) return existing.id as string;
  const { data, error } = await supabase
    .from("companies")
    .insert({
      owner_id: userId,
      name_ar: LAUNCH_COMPANY_NAME_AR,
      name_en: LAUNCH_COMPANY_NAME_EN,
      country: "Egypt",
      is_system: true,
      is_launch_content: true,
      description_ar: "حاوية إدارية لمحتوى الإطلاق التجريبي المُدار من قِبَل الإدارة.",
      description_en: "Admin-managed container for launch/demo content.",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export const getLaunchCompanyId = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    return { companyId: await ensureLaunchCompany(context as Ctx) };
  });

type ListingImport = {
  type: "product" | "land" | "real_estate" | "service" | "business_opportunity";
  title_ar: string;
  title_en?: string;
  description_ar?: string;
  description_en?: string;
  category?: string;
  governorate?: string;
  city?: string;
  price?: number;
  currency?: string;
  images?: string[];
  phone?: string;
  whatsapp?: string;
  source_name?: string;
  source_url?: string;
  featured?: boolean;
};

export const importLaunchListings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { rows: ListingImport[]; sourceName?: string; notes?: string }) => {
    if (!Array.isArray(d?.rows) || d.rows.length === 0) throw new Error("No rows");
    if (d.rows.length > 500) throw new Error("Max 500 rows per import");
    return d;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const companyId = await ensureLaunchCompany(ctx);

    const { data: batch, error: bErr } = await ctx.supabase
      .from("launch_import_batches")
      .insert({
        admin_user_id: ctx.userId,
        content_type: "listing",
        source_name: data.sourceName ?? null,
        notes: data.notes ?? null,
        item_count: data.rows.length,
      })
      .select("id")
      .single();
    if (bErr) throw new Error(bErr.message);

    const payload = data.rows.map((r) => ({
      company_id: companyId,
      type: r.type,
      title_ar: (r.title_ar || "").slice(0, 300) || "بدون عنوان",
      title_en: (r.title_en || r.title_ar || "").slice(0, 300) || "Untitled",
      description_ar: r.description_ar ?? null,
      description_en: r.description_en ?? null,
      category: r.category ?? null,
      governorate: r.governorate ?? null,
      city: r.city ?? null,
      country: "Egypt",
      price: r.price != null && !Number.isNaN(Number(r.price)) ? Number(r.price) : null,
      currency: r.currency || "EGP",
      images: Array.isArray(r.images) ? r.images : [],
      phone: r.phone ?? null,
      whatsapp: r.whatsapp ?? null,
      source_name: r.source_name ?? data.sourceName ?? null,
      source_url: r.source_url ?? null,
      is_launch_content: true,
      import_batch_id: batch.id,
      imported_by: ctx.userId,
      status: "active",
      featured: !!r.featured,
    }));

    const { error: iErr, count } = await ctx.supabase
      .from("listings")
      .insert(payload, { count: "exact" });
    if (iErr) {
      // rollback batch
      await ctx.supabase.from("launch_import_batches").delete().eq("id", batch.id);
      throw new Error(iErr.message);
    }
    return { batchId: batch.id as string, inserted: count ?? payload.length };
  });

export const listLaunchBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const { data, error } = await ctx.supabase
      .from("launch_import_batches")
      .select("id, content_type, source_name, notes, item_count, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { batches: data ?? [] };
  });

export const deleteLaunchBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { batchId: string }) => {
    if (!d?.batchId) throw new Error("batchId required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    // Only delete launch content rows from this batch — protects real users' data.
    const tables = ["listings", "companies", "factories", "rfqs"] as const;
    let deleted = 0;
    for (const t of tables) {
      const { data: rows, error } = await ctx.supabase
        .from(t)
        .delete()
        .eq("import_batch_id", data.batchId)
        .eq("is_launch_content", true)
        .select("id");
      if (error) throw new Error(`${t}: ${error.message}`);
      deleted += rows?.length ?? 0;
    }
    await ctx.supabase.from("launch_import_batches").delete().eq("id", data.batchId);
    return { deleted };
  });

export const listLaunchListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { batchId?: string; governorate?: string; type?: string }) => d ?? {})
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    let q = ctx.supabase
      .from("listings")
      .select("id, type, title_ar, title_en, governorate, city, price, currency, featured, status, source_name, source_url, import_batch_id, created_at")
      .eq("is_launch_content", true)
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.batchId) q = q.eq("import_batch_id", data.batchId);
    if (data.governorate) q = q.eq("governorate", data.governorate);
    if (data.type) q = q.eq("type", data.type);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const adminToggleListingFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; field: "featured" | "status"; value: boolean | string }) => {
    if (!d?.id || !d.field) throw new Error("Invalid");
    if (d.field === "status" && typeof d.value !== "string") throw new Error("Invalid status");
    return d;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const patch: any = { [data.field]: data.value };
    const { error } = await ctx.supabase.from("listings").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteLaunchListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("id required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const { error } = await ctx.supabase
      .from("listings")
      .delete()
      .eq("id", data.id)
      .eq("is_launch_content", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
