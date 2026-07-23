import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getShippingQuote } from "@/lib/shipping";

async function resolveOrderActor(
  order: { buyer_id: string; product_listing_id: string | null; listing_id: string | null },
  userId: string,
  adminClient: any,
): Promise<{ isAdmin: boolean; isBuyer: boolean; isSeller: boolean }> {
  const { data: isAdmin } = await adminClient.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  const isBuyer = order.buyer_id === userId;
  let isSeller = false;
  const lid = order.product_listing_id ?? order.listing_id;
  if (lid) {
    const { data: listing } = await adminClient
      .from("listings")
      .select("company_id")
      .eq("id", lid)
      .maybeSingle();
    if (listing?.company_id) {
      const { data: company } = await adminClient
        .from("companies")
        .select("owner_id")
        .eq("id", listing.company_id)
        .maybeSingle();
      isSeller = company?.owner_id === userId;
    }
  }
  return { isAdmin: !!isAdmin, isBuyer, isSeller };
}

const ORDER_STATUS = z.enum([
  "draft",
  "awaiting_seller",
  "accepted",
  "rejected",
  "packed",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "returned",
]);

export const createOrderFromListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        listing_id: z.string().uuid(),
        checkout_session_id: z.string().uuid().optional().nullable(),
        quantity: z.number().int().positive().default(1),
        notes: z.string().max(2000).optional().nullable(),
        contact_phone: z.string().max(30).optional().nullable(),
        shipping_address: z
          .object({
            recipient_name: z.string().min(2).max(120),
            phone: z.string().min(6).max(30),
            governorate: z.string().min(1).max(120),
            city: z.string().min(1).max(120),
            address_line: z.string().min(3).max(500),
          })
          .optional()
          .nullable(),
        conversation_id: z.string().uuid().optional().nullable(),
        referral_code: z.string().min(4).max(32).optional().nullable(),
        coupon_code: z
          .string()
          .trim()
          .min(3)
          .max(40)
          .regex(/^[A-Z0-9_-]+$/i)
          .optional()
          .nullable(),
      })
      .parse(d),
  )

  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: allowed, error: limitError } = await (supabase.rpc as any)(
      "consume_auth_rate_limit",
      { p_action: "checkout:create-order", p_max_requests: 30, p_window_seconds: 60 },
    );
    if (limitError) throw new Error(limitError.message);
    if (!allowed) throw new Error("محاولات كثيرة؛ انتظر دقيقة ثم حاول مرة أخرى");

    const shippingQuote = data.shipping_address
      ? getShippingQuote(data.shipping_address.governorate)
      : { amount: 0, etaMinDays: 0, etaMaxDays: 0 };

    // Delegate to the atomic RPC: all validation, pricing, coupon usage,
    // and order insert happen in a single transaction. No partial state.
    const { data: result, error: rpcError } = await (supabase.rpc as any)(
      "create_order_atomic",
      {
        p_buyer_id: userId,
        p_listing_id: data.listing_id,
        p_quantity: data.quantity,
        p_notes: data.notes ?? null,
        p_contact_phone: data.contact_phone ?? null,
        p_shipping_address: data.shipping_address ?? null,
        p_shipping_amount: shippingQuote.amount,
        p_shipping_eta_min_days: shippingQuote.etaMinDays || null,
        p_shipping_eta_max_days: shippingQuote.etaMaxDays || null,
        p_checkout_session_id: data.checkout_session_id ?? null,
        p_referral_code: data.referral_code ?? null,
        p_coupon_code: data.coupon_code ?? null,
        p_conversation_id: data.conversation_id ?? null,
      },
    );
    if (rpcError) throw new Error(rpcError.message);
    if (!result?.order_id) throw new Error("تعذر إنشاء الطلب");
    return { id: result.order_id as string };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: ORDER_STATUS,
        tracking_number: z.string().max(120).optional().nullable(),
        tracking_carrier: z.string().max(120).optional().nullable(),
        cancelled_reason: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { data: order, error: orderError } = await (
      supabaseAdmin.from("wholesale_orders" as never) as any
    )
      .select("id, buyer_id, status, payment_status, product_listing_id, listing_id")
      .eq("id", data.id)
      .maybeSingle();
    if (orderError) throw new Error(orderError.message);
    if (!order) throw new Error("Order not found");

    const listingId = order.product_listing_id ?? order.listing_id;
    let sellerId: string | null = null;
    if (listingId) {
      const { data: listing } = await supabaseAdmin
        .from("listings")
        .select("company_id")
        .eq("id", listingId)
        .maybeSingle();
      if (listing?.company_id) {
        const { data: company } = await supabaseAdmin
          .from("companies")
          .select("owner_id")
          .eq("id", listing.company_id)
          .maybeSingle();
        sellerId = company?.owner_id ?? null;
      }
    }
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    const actor = isAdmin
      ? "admin"
      : order.buyer_id === userId
        ? "buyer"
        : sellerId === userId
          ? "seller"
          : "none";
    if (actor === "none") throw new Error("غير مسموح لك بتعديل هذا الطلب");

    const allowed: Record<"buyer" | "seller", Record<string, string[]>> = {
      buyer: {
        awaiting_seller: ["cancelled"],
        accepted: ["cancelled"],
        delivered: ["completed", "returned"],
      },
      seller: {
        awaiting_seller: ["accepted", "rejected"],
        accepted: ["packed"],
        packed: ["shipped"],
        shipped: ["delivered"],
      },
    };
    if (actor !== "admin" && !allowed[actor][order.status]?.includes(data.status)) {
      throw new Error("انتقال حالة الطلب غير مسموح");
    }
    if (
      actor === "seller" &&
      ["packed", "shipped", "delivered"].includes(data.status) &&
      order.payment_status !== "paid"
    ) {
      throw new Error("لا يمكن تجهيز أو شحن الطلب قبل تأكيد الدفع");
    }
    if (
      data.status === "shipped" &&
      (!data.tracking_number?.trim() || !data.tracking_carrier?.trim())
    ) {
      throw new Error("أدخل شركة الشحن ورقم التتبع");
    }

    const patch: Record<string, unknown> = { status: data.status };
    if (data.tracking_number !== undefined) patch.tracking_number = data.tracking_number;
    if (data.tracking_carrier !== undefined) patch.tracking_carrier = data.tracking_carrier;
    if (data.cancelled_reason !== undefined) patch.cancelled_reason = data.cancelled_reason;
    if (data.status === "delivered") patch.delivered_at = new Date().toISOString();
    if (data.status === "completed") patch.completed_at = new Date().toISOString();
    const { data: updated, error } = await (supabaseAdmin.from("wholesale_orders" as never) as any)
      .update(patch)
      .eq("id", data.id)
      .eq("status", order.status)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("تم تحديث الطلب من جلسة أخرى؛ حدّث الصفحة وحاول مجددًا");
    return { ok: true };
  });

async function enrichOrders(supabase: any, orders: any[]) {
  const listingIds = Array.from(
    new Set(orders.map((o) => o.product_listing_id ?? o.listing_id).filter(Boolean)),
  );
  if (!listingIds.length) return orders.map((o) => ({ ...o, _listing: null, _company: null }));
  const { data: listings } = (await supabase
    .from("listings")
    .select("id, title_ar, title_en, images, company_id, currency")
    .in("id", listingIds)) as { data: any[] | null };
  const companyIds = Array.from(
    new Set((listings ?? []).map((l: any) => l.company_id).filter(Boolean)),
  );
  const companiesRes = companyIds.length
    ? await supabase.from("companies").select("id, name_ar, name_en, logo_url").in("id", companyIds)
    : { data: [] as any[] };
  const companies = companiesRes.data as any[] | null;
  const lm = new Map((listings ?? []).map((l: any) => [l.id, l]));
  const cm = new Map((companies ?? []).map((c: any) => [c.id, c]));
  return orders.map((o) => {
    const l = lm.get(o.product_listing_id ?? o.listing_id) ?? null;
    const c = l ? (cm.get(l.company_id) ?? null) : null;
    return { ...o, _listing: l, _company: c };
  });
}

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: mine } = await (supabase.from("wholesale_orders" as never) as any)
      .select("*")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    const { data: companies } = await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", userId);
    const companyIds = (companies ?? []).map((c) => c.id);
    let asSeller: any[] = [];
    if (companyIds.length) {
      const { data: prodListings } = await supabase
        .from("listings")
        .select("id")
        .in("company_id", companyIds);
      const { data: whListings } = await supabase
        .from("wholesale_listings")
        .select("id")
        .in("company_id", companyIds);
      const listingIds = [
        ...(prodListings ?? []).map((l) => l.id),
        ...(whListings ?? []).map((l) => l.id),
      ];
      if (listingIds.length) {
        const { data: sellerOrders } = await (supabase.from("wholesale_orders" as never) as any)
          .select("*")
          .or(
            `product_listing_id.in.(${listingIds.join(",")}),listing_id.in.(${listingIds.join(",")})`,
          )
          .order("created_at", { ascending: false })
          .limit(200);
        asSeller = sellerOrders ?? [];
      }
    }
    const [buyerEnriched, sellerEnriched] = await Promise.all([
      enrichOrders(supabase, mine ?? []),
      enrichOrders(supabase, asSeller ?? []),
    ]);
    return { asBuyer: buyerEnriched, asSeller: sellerEnriched };
  });

export const getOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: order, error } = await (supabaseAdmin.from("wholesale_orders" as never) as any)
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");

    // Authorization: only buyer, seller, or admin may view.
    const actor = await resolveOrderActor(order, userId, supabaseAdmin);
    if (!actor.isAdmin && !actor.isBuyer && !actor.isSeller) {
      throw new Error("غير مسموح لك بعرض هذا الطلب");
    }

    const listingId = order.product_listing_id ?? order.listing_id;
    let listing: any = null;
    let company: any = null;
    if (listingId) {
      const { data: l } = await supabaseAdmin
        .from("listings")
        .select("id, title_ar, title_en, images, company_id, currency")
        .eq("id", listingId)
        .maybeSingle();
      listing = l;
      if (l?.company_id) {
        const { data: c } = await supabaseAdmin
          .from("companies")
          .select("id, name_ar, name_en, logo_url, owner_id")
          .eq("id", l.company_id)
          .maybeSingle();
        company = c;
      }
    }
    return { order, listing, company };
  });
