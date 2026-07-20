import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const couponSchema = z.object({
  id: z.string().uuid().optional(),
  store_id: z.string().uuid(),
  code: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/i),
  type: z.enum(["percent", "fixed"]),
  value: z.number().positive(),
  min_order: z.number().min(0).default(0),
  max_discount: z.number().positive().optional().nullable(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  usage_limit_total: z.number().int().positive().optional().nullable(),
  usage_limit_per_user: z.number().int().positive().default(1),
  active: z.boolean().default(true),
  applies_to: z.record(z.string(), z.any()).default({}),
});

async function assertStoreOwner(supabase: any, userId: string, store_id: string) {
  const { data } = await supabase
    .from("stores")
    .select("id, owner_id")
    .eq("id", store_id)
    .maybeSingle();
  if (!data || data.owner_id !== userId) throw new Error("غير مسموح");
}

export const listCoupons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ store_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStoreOwner(context.supabase, context.userId, data.store_id);
    const { data: items } = await (context.supabase.from("store_coupons" as never) as any)
      .select("*")
      .eq("store_id", data.store_id)
      .order("created_at", { ascending: false });
    return { items: items ?? [] };
  });

export const upsertCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => couponSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertStoreOwner(context.supabase, context.userId, data.store_id);
    const payload = { ...data, code: data.code.toUpperCase() };
    if (data.id) {
      const { error } = await (context.supabase.from("store_coupons" as never) as any)
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await (context.supabase.from("store_coupons" as never) as any)
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), store_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStoreOwner(context.supabase, context.userId, data.store_id);
    await (context.supabase.from("store_coupons" as never) as any).delete().eq("id", data.id);
    return { ok: true };
  });

export const validateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        store_id: z.string().uuid(),
        code: z.string().min(3).max(40),
        subtotal: z.number().min(0),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: coupon } = await (context.supabase.from("store_coupons" as never) as any)
      .select("*")
      .eq("store_id", data.store_id)
      .eq("code", data.code.toUpperCase())
      .eq("active", true)
      .maybeSingle();
    if (!coupon) throw new Error("كوبون غير صالح");
    const now = Date.now();
    if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now)
      throw new Error("الكوبون لم يبدأ بعد");
    if (coupon.ends_at && new Date(coupon.ends_at).getTime() < now)
      throw new Error("انتهت صلاحية الكوبون");
    if (data.subtotal < Number(coupon.min_order || 0))
      throw new Error(`الحد الأدنى للطلب ${coupon.min_order} ج.م`);
    if (coupon.usage_limit_total && coupon.used_count >= coupon.usage_limit_total)
      throw new Error("انتهى استخدام الكوبون");
    const { count: userUsed } = await (context.supabase.from("store_coupon_usage" as never) as any)
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .eq("user_id", context.userId);
    if ((userUsed ?? 0) >= Number(coupon.usage_limit_per_user || 1))
      throw new Error("لقد استخدمت هذا الكوبون من قبل");
    let discount =
      coupon.type === "percent"
        ? (data.subtotal * Number(coupon.value)) / 100
        : Number(coupon.value);
    if (coupon.max_discount) discount = Math.min(discount, Number(coupon.max_discount));
    discount = Math.min(discount, data.subtotal);
    return { discount: Math.round(discount * 100) / 100, coupon_id: coupon.id, code: coupon.code };
  });
