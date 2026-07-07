import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ORDER_STATUS = z.enum([
  "draft","awaiting_seller","accepted","rejected","packed","shipped","delivered","completed","cancelled","returned",
]);

export const createOrderFromListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      listing_id: z.string().uuid(),
      quantity: z.number().int().positive().default(1),
      notes: z.string().max(2000).optional().nullable(),
      contact_phone: z.string().max(30).optional().nullable(),
      shipping_address: z.object({
        recipient_name: z.string(),
        phone: z.string(),
        governorate: z.string(),
        city: z.string(),
        address_line: z.string(),
      }).optional().nullable(),
      conversation_id: z.string().uuid().optional().nullable(),
      referral_code: z.string().min(4).max(32).optional().nullable(),
    }).parse(d),
  )

  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: listing, error } = await supabase
      .from("listings")
      .select("id, company_id, price, currency, title_ar, title_en")
      .eq("id", data.listing_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!listing) throw new Error("Listing not found");
    const price = Number(listing.price ?? 0);
    const total = price * data.quantity;

    const insertPayload = {
      buyer_id: userId,
      product_listing_id: listing.id,
      quantity: data.quantity,
      notes: data.notes ?? null,
      contact_phone: data.contact_phone ?? null,
      status: "awaiting_seller",
      unit_price: price,
      total_amount: total,
      currency: listing.currency ?? "EGP",
      shipping_address: data.shipping_address ?? null,
      conversation_id: data.conversation_id ?? null,
      payment_status: "unpaid",
    } as Record<string, unknown>;

    const { data: created, error: iErr } = await (supabase.from("wholesale_orders" as never) as any)
      .insert(insertPayload)
      .select("id")
      .single();
    if (iErr) throw new Error(iErr.message);

    // Notify seller
    const { data: comp } = await supabase.from("companies").select("owner_id").eq("id", listing.company_id as string).maybeSingle();
    if (comp?.owner_id) {
      await (supabase.from("notifications" as never) as any).insert({
        user_id: comp.owner_id,
        type: "order",
        title: "طلب جديد",
        body: `طلب جديد على ${listing.title_ar ?? listing.title_en ?? "منتج"}`,
        link: `/orders/${created.id}`,
      });
    }
    return { id: created.id as string };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: ORDER_STATUS,
    tracking_number: z.string().max(120).optional().nullable(),
    tracking_carrier: z.string().max(120).optional().nullable(),
    cancelled_reason: z.string().max(500).optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const patch: Record<string, unknown> = { status: data.status };
    if (data.tracking_number !== undefined) patch.tracking_number = data.tracking_number;
    if (data.tracking_carrier !== undefined) patch.tracking_carrier = data.tracking_carrier;
    if (data.cancelled_reason !== undefined) patch.cancelled_reason = data.cancelled_reason;
    if (data.status === "delivered") patch.delivered_at = new Date().toISOString();
    if (data.status === "completed") patch.completed_at = new Date().toISOString();
    const { error } = await (supabase.from("wholesale_orders" as never) as any).update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // Buyer orders
    const { data: mine } = await (supabase.from("wholesale_orders" as never) as any)
      .select("*")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    // Seller orders (via my company)
    const { data: companies } = await supabase.from("companies").select("id").eq("owner_id", userId);
    const companyIds = (companies ?? []).map((c) => c.id);
    let asSeller: any[] = [];
    if (companyIds.length) {
      // Product orders via listings, wholesale via wholesale_listings
      const { data: prodListings } = await supabase.from("listings").select("id").in("company_id", companyIds);
      const { data: whListings } = await supabase.from("wholesale_listings").select("id").in("company_id", companyIds);
      const listingIds = [...(prodListings ?? []).map((l) => l.id), ...(whListings ?? []).map((l) => l.id)];
      if (listingIds.length) {
        const { data: sellerOrders } = await (supabase.from("wholesale_orders" as never) as any)
          .select("*")
          .or(`product_listing_id.in.(${listingIds.join(",")}),listing_id.in.(${listingIds.join(",")})`)
          .order("created_at", { ascending: false })
          .limit(200);
        asSeller = sellerOrders ?? [];
      }
    }
    return { asBuyer: mine ?? [], asSeller };
  });

export const getOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: order, error } = await (supabase.from("wholesale_orders" as never) as any)
      .select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");
    // Fetch related listing for display
    const listingId = order.product_listing_id ?? order.listing_id;
    let listing: any = null;
    if (listingId) {
      const { data: l } = await supabase.from("listings").select("id, title_ar, title_en, images, company_id, currency").eq("id", listingId).maybeSingle();
      listing = l;
    }
    return { order, listing };
  });
