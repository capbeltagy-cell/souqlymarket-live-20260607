import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertNotPureMarketer } from "@/lib/marketer-guard";

const itemSchema = z.object({
  listing_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(300),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
});

function calcTotals(
  items: z.infer<typeof itemSchema>[],
  discount: number,
  tax: number,
  shipping: number,
) {
  const itemsOut = items.map((it) => ({
    ...it,
    total: Math.max(0, it.quantity * it.unit_price - (it.discount || 0)),
  }));
  const subtotal = itemsOut.reduce((s, i) => s + i.total, 0);
  const total = Math.max(0, subtotal - (discount || 0) + (tax || 0) + (shipping || 0));
  return { itemsOut, subtotal, total };
}

export const createQuotation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        conversation_id: z.string().uuid(),
        items: z.array(itemSchema).min(1),
        currency: z.string().default("EGP"),
        discount: z.number().nonnegative().default(0),
        tax: z.number().nonnegative().default(0),
        shipping: z.number().nonnegative().default(0),
        expiry_date: z.string().optional().nullable(),
        notes: z.string().max(2000).optional().nullable(),
        send: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertNotPureMarketer(supabase as never, userId);
    const { data: conv, error: cErr } = await (supabase.from("conversations" as never) as any)
      .select("id, buyer_id, seller_id, listing_id")
      .eq("id", data.conversation_id)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!conv) throw new Error("Conversation not found");
    if (conv.seller_id !== userId) throw new Error("فقط البائع يمكنه إنشاء عرض السعر");

    let sellerCompanyId: string | null = null;
    if (conv.listing_id) {
      const { data: l } = await supabase
        .from("listings")
        .select("company_id")
        .eq("id", conv.listing_id)
        .maybeSingle();
      sellerCompanyId = (l?.company_id as string) ?? null;
    }
    if (!sellerCompanyId) {
      const { data: c } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", userId)
        .maybeSingle();
      sellerCompanyId = c?.id ?? null;
    }

    const { itemsOut, subtotal, total } = calcTotals(
      data.items,
      data.discount,
      data.tax,
      data.shipping,
    );

    const { data: q, error: qErr } = await (supabase.from("quotations" as never) as any)
      .insert({
        conversation_id: conv.id,
        seller_company_id: sellerCompanyId,
        seller_id: userId,
        buyer_id: conv.buyer_id,
        status: data.send ? "sent" : "draft",
        currency: data.currency,
        subtotal,
        discount: data.discount,
        tax: data.tax,
        shipping: data.shipping,
        total,
        expiry_date: data.expiry_date || null,
        notes: data.notes ?? null,
      })
      .select("id")
      .single();
    if (qErr) throw new Error(qErr.message);

    const { error: iErr } = await (supabase.from("quotation_items" as never) as any).insert(
      itemsOut.map((it) => ({
        quotation_id: q.id,
        listing_id: it.listing_id ?? null,
        title: it.title,
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount: it.discount,
        total: it.total,
      })),
    );
    if (iErr) throw new Error(iErr.message);

    // Post an in-chat card message
    await (supabase.from("messages" as never) as any).insert({
      conversation_id: conv.id,
      sender_id: userId,
      body: `[[quotation:${q.id}]] عرض سعر بقيمة ${total.toLocaleString("ar-EG")} ${data.currency}`,
    });

    return { id: q.id as string };
  });

export const getQuotation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: q, error } = await (supabase.from("quotations" as never) as any)
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!q) throw new Error("Quotation not found");
    const { data: items } = await (supabase.from("quotation_items" as never) as any)
      .select("*")
      .eq("quotation_id", data.id)
      .order("created_at");
    return { quotation: q, items: items ?? [] };
  });

export const respondToQuotation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["accept", "reject"]),
        shipping_address: z
          .object({
            recipient_name: z.string(),
            phone: z.string(),
            governorate: z.string(),
            city: z.string(),
            address_line: z.string(),
          })
          .optional()
          .nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: q } = await (supabase.from("quotations" as never) as any)
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!q) throw new Error("Quotation not found");
    if (q.buyer_id !== userId) throw new Error("فقط المشتري يمكنه الرد");
    if (!["sent", "draft"].includes(q.status)) throw new Error("لا يمكن تعديل هذا العرض");

    if (data.action === "reject") {
      const { error } = await (supabase.from("quotations" as never) as any)
        .update({ status: "rejected" })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const { data: result, error: orderError } = await (supabase.rpc as any)(
      "accept_quotation_atomic",
      {
        p_quotation_id: data.id,
        p_shipping_address: data.shipping_address ?? null,
      },
    );
    if (orderError) throw new Error(orderError.message);
    if (!result?.order_id) throw new Error("تعذر إنشاء الطلب من عرض السعر.");

    if (q.conversation_id) {
      await (supabase.from("messages" as never) as any).insert({
        conversation_id: q.conversation_id,
        sender_id: userId,
        body: `[[order:${result.order_id}]] تم إنشاء طلب من عرض السعر`,
      });
    }
    return { ok: true, order_id: result.order_id as string };
  });

export const listMyQuotations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await (supabase.from("quotations" as never) as any)
      .select("*")
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(200);
    return { items: data ?? [] };
  });
