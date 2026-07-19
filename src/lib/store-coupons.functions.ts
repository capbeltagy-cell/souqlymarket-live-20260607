import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getOwnedStore(supabase: any, userId: string) {
  const { data: company, error: companyError } = await supabase.from("companies").select("id").eq("owner_id", userId).maybeSingle();
  if (companyError) throw new Error(companyError.message);
  if (!company) throw new Error("Create a company profile first.");
  const { data: store, error } = await supabase.from("stores").select("id").eq("company_id", company.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!store) throw new Error("Create your store first.");
  return store as { id: string };
}

export const listMyStoreCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const store = await getOwnedStore(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("store_coupons").select("*").eq("store_id", store.id).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveStoreCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    id: z.string().uuid().optional(),
    code: z.string().trim().min(3).max(32).transform((v) => v.toUpperCase().replace(/[^A-Z0-9_-]/g, "")),
    discount_type: z.enum(["percentage", "fixed"]),
    discount_value: z.number().positive().max(100000),
    minimum_order_amount: z.number().nonnegative().default(0),
    maximum_discount_amount: z.number().positive().optional().nullable(),
    usage_limit: z.number().int().positive().optional().nullable(),
    starts_at: z.string().datetime().optional().nullable(),
    ends_at: z.string().datetime().optional().nullable(),
    is_active: z.boolean().default(true),
  }).refine((v) => v.discount_type !== "percentage" || v.discount_value <= 100, { message: "Percentage cannot exceed 100" }).parse(value))
  .handler(async ({ context, data }) => {
    const store = await getOwnedStore(context.supabase, context.userId);
    const payload = { ...data, store_id: store.id };
    const query = data.id
      ? context.supabase.from("store_coupons").update(payload).eq("id", data.id).eq("store_id", store.id)
      : context.supabase.from("store_coupons").insert(payload);
    const { data: row, error } = await query.select("id").single();
    if (error) {
      if (error.code === "23505") throw new Error("COUPON_CODE_TAKEN");
      throw new Error(error.message);
    }
    return row;
  });

export const deleteStoreCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ id: z.string().uuid() }).parse(value))
  .handler(async ({ context, data }) => {
    const store = await getOwnedStore(context.supabase, context.userId);
    const { error } = await context.supabase.from("store_coupons").delete().eq("id", data.id).eq("store_id", store.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
