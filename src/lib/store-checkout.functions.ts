import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getShippingQuote } from "@/lib/shipping";

const couponCode = z.string().trim().min(3).max(32).transform((value) => value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""));

async function resolveCoupon(listingId: string, code: string, subtotal: number) {
  const { data: listing, error: listingError } = await supabaseAdmin
    .from("listings")
    .select("id,company_id")
    .eq("id", listingId)
    .maybeSingle();
  if (listingError) throw new Error(listingError.message);
  if (!listing) throw new Error("Listing not found");

  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id,status")
    .eq("company_id", listing.company_id)
    .eq("status", "published")
    .maybeSingle();
  if (storeError) throw new Error(storeError.message);
  if (!store) throw new Error("COUPON_NOT_AVAILABLE");

  const now = new Date().toISOString();
  const { data: coupon, error } = await supabaseAdmin
    .from("store_coupons")
    .select("id,code,discount_type,discount_value,minimum_order_amount,maximum_discount_amount,usage_limit,used_count,starts_at,ends_at,is_active")
    .eq("store_id", store.id)
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!coupon || !coupon.is_active) throw new Error("INVALID_COUPON");
  if (coupon.starts_at && coupon.starts_at > now) throw new Error("COUPON_NOT_STARTED");
  if (coupon.ends_at && coupon.ends_at < now) throw new Error("COUPON_EXPIRED");
  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) throw new Error("COUPON_LIMIT_REACHED");
  if (subtotal < Number(coupon.minimum_order_amount ?? 0)) throw new Error("COUPON_MINIMUM_NOT_MET");

  let discount = coupon.discount_type === "percentage"
    ? subtotal * (Number(coupon.discount_value) / 100)
    : Number(coupon.discount_value);
  if (coupon.maximum_discount_amount !== null) discount = Math.min(discount, Number(coupon.maximum_discount_amount));
  discount = Math.max(0, Math.min(discount, subtotal));

  return { coupon, discount: Math.round(discount * 100) / 100 };
}

export const quoteStoreCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ listing_id: z.string().uuid(), quantity: z.number().int().positive(), code: couponCode }).parse(value))
  .handler(async ({ data }) => {
    const { data: listing, error } = await supabaseAdmin.from("listings").select("price").eq("id", data.listing_id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!listing) throw new Error("Listing not found");
    const subtotal = Number(listing.price ?? 0) * data.quantity;
    const result = await resolveCoupon(data.listing_id, data.code, subtotal);
    return { code: result.coupon.code, subtotal, discount: result.discount, total_after_discount: subtotal - result.discount };
  });

export const createStoreOrderFromListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    listing_id: z.string().uuid(),
    checkout_session_id: z.string().uuid().optional().nullable(),
    quantity: z.number().int().positive().default(1),
    notes: z.string().max(2000).optional().nullable(),
    contact_phone: z.string().max(30).optional().nullable(),
    shipping_address: z.object({ recipient_name: z.string().min(2).max(120), phone: z.string().min(6).max(30), governorate: z.string().min(1).max(120), city: z.string().min(1).max(120), address_line: z.string().min(3).max(500) }).optional().nullable(),
    referral_code: z.string().min(4).max(32).optional().nullable(),
    coupon_code: couponCode.optional().nullable(),
  }).parse(value))
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { data: listing, error } = await supabaseAdmin
      .from("listings")
      .select("id,company_id,price,currency,title_ar,title_en,status,type,track_inventory,stock_quantity,min_order_quantity")
      .eq("id", data.listing_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!listing) throw new Error("Listing not found");
    if (listing.status !== "approved") throw new Error("هذا العرض غير متاح للشراء حاليًا");
    const price = Number(listing.price ?? 0);
    if (!Number.isFinite(price) || price <= 0) throw new Error("لا يمكن شراء عرض بدون سعر صالح");
    if (["product", "market"].includes(listing.type) && !data.shipping_address) throw new Error("عنوان الشحن مطلوب لإتمام شراء هذا المنتج");
    if (data.quantity < (listing.min_order_quantity ?? 1)) throw new Error(`الحد الأدنى للطلب ${listing.min_order_quantity} قطعة`);
    if (listing.track_inventory && data.quantity > Number(listing.stock_quantity ?? 0)) throw new Error("الكمية المطلوبة غير متاحة في المخزون");

    const { data: sellerCompany } = await supabaseAdmin.from("companies").select("owner_id").eq("id", listing.company_id).maybeSingle();
    if (sellerCompany?.owner_id === userId) throw new Error("لا يمكنك شراء عرض تابع لشركتك");

    const subtotal = price * data.quantity;
    const couponResult = data.coupon_code ? await resolveCoupon(listing.id, data.coupon_code, subtotal) : null;
    const discount = couponResult?.discount ?? 0;
    const shippingQuote = data.shipping_address ? getShippingQuote(data.shipping_address.governorate) : { amount: 0, etaMinDays: 0, etaMaxDays: 0 };
    const total = subtotal - discount + shippingQuote.amount;

    const { data: created, error: insertError } = await (supabaseAdmin.from("wholesale_orders" as never) as any)
      .insert({
        buyer_id: userId,
        product_listing_id: listing.id,
        quantity: data.quantity,
        notes: data.notes ?? null,
        contact_phone: data.contact_phone ?? null,
        status: "awaiting_seller",
        unit_price: price,
        subtotal_amount: subtotal,
        discount_amount: discount,
        coupon_code: couponResult?.coupon.code ?? null,
        total_amount: total,
        shipping_amount: shippingQuote.amount,
        shipping_eta_min_days: shippingQuote.etaMinDays || null,
        shipping_eta_max_days: shippingQuote.etaMaxDays || null,
        currency: listing.currency ?? "EGP",
        shipping_address: data.shipping_address ?? null,
        payment_status: "unpaid",
        referral_code: data.referral_code ?? null,
        checkout_session_id: data.checkout_session_id ?? null,
      })
      .select("id")
      .single();
    if (insertError) {
      if (insertError.code === "23505" && data.checkout_session_id) {
        const { data: existing } = await (supabaseAdmin.from("wholesale_orders" as never) as any)
          .select("id").eq("buyer_id", userId).eq("checkout_session_id", data.checkout_session_id).eq("product_listing_id", listing.id).maybeSingle();
        if (existing?.id) return { id: existing.id as string, discount };
      }
      throw new Error(insertError.message);
    }

    if (couponResult) {
      const previousCount = Number(couponResult.coupon.used_count ?? 0);
      const { error: incrementError } = await supabaseAdmin
        .from("store_coupons")
        .update({ used_count: previousCount + 1 })
        .eq("id", couponResult.coupon.id)
        .eq("used_count", previousCount);
      if (incrementError) throw new Error(incrementError.message);
    }

    if (sellerCompany?.owner_id) {
      await (supabaseAdmin.from("notifications" as never) as any).insert({ user_id: sellerCompany.owner_id, type: "order", title: "طلب جديد", body: `طلب جديد على ${listing.title_ar ?? listing.title_en ?? "منتج"}`, link: `/orders/${created.id}` });
    }
    return { id: created.id as string, discount };
  });
