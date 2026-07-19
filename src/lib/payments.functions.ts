import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listActivePaymentMethods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase.from("payment_methods" as never) as any)
      .select("*").eq("is_active", true).order("sort_order");
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const listAllPaymentMethods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase.from("payment_methods" as never) as any)
      .select("*").order("sort_order");
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const upsertPaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    code: z.string().min(2).max(50),
    name_ar: z.string().min(1),
    name_en: z.string().optional().nullable(),
    instructions_ar: z.string().optional().nullable(),
    instructions_en: z.string().optional().nullable(),
    account_details: z.record(z.string(), z.any()).default({}),
    icon: z.string().optional().nullable(),
    is_active: z.boolean().default(true),
    sort_order: z.number().int().default(0),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const payload = { ...data };
    const { error } = await (context.supabase.from("payment_methods" as never) as any)
      .upsert(payload, { onConflict: "code" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitPaymentProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    order_id: z.string().uuid(),
    payment_method_id: z.string().uuid(),
    amount: z.number().positive(),
    currency: z.string().default("EGP"),
    proof_url: z.string().url().optional().nullable(),
    reference: z.string().max(200).optional().nullable(),
    note: z.string().max(500).optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: order } = await (supabase.from("wholesale_orders" as never) as any)
      .select("id, buyer_id, product_listing_id, listing_id, currency, total_amount, payment_status").eq("id", data.order_id).maybeSingle();
    if (!order) throw new Error("Order not found");
    if (order.buyer_id !== userId) throw new Error("فقط المشتري يمكنه رفع إثبات الدفع");
    if (order.payment_status === "paid") throw new Error("تم دفع هذا الطلب بالفعل");
    if (Math.abs(Number(order.total_amount) - data.amount) > 0.01) {
      throw new Error("يجب أن يطابق المبلغ إجمالي الطلب");
    }

    // Resolve seller
    let sellerId: string | null = null;
    const lid = order.product_listing_id ?? order.listing_id;
    if (lid) {
      const { data: l } = await supabase.from("listings").select("company_id").eq("id", lid).maybeSingle();
      if (l?.company_id) {
        const { data: c } = await supabase.from("companies").select("owner_id").eq("id", l.company_id).maybeSingle();
        sellerId = c?.owner_id ?? null;
      }
    }

    const { data: pm } = await (supabase.from("payment_methods" as never) as any)
      .select("code, is_active").eq("id", data.payment_method_id).maybeSingle();
    if (!pm?.is_active) throw new Error("طريقة الدفع غير متاحة حاليًا");
    if (pm.code !== "cash" && !data.proof_url && !data.reference) {
      throw new Error("أرفق إثبات الدفع أو اكتب رقم العملية");
    }

    const { error } = await (supabase.from("payment_proofs" as never) as any).insert({
      order_id: data.order_id,
      buyer_id: userId,
      seller_id: sellerId,
      payment_method_id: data.payment_method_id,
      payment_method_code: pm?.code ?? null,
      amount: data.amount,
      currency: data.currency,
      proof_url: data.proof_url ?? null,
      reference: data.reference ?? null,
      note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    await (supabase.from("wholesale_orders" as never) as any)
      .update({ payment_status: "pending_review" }).eq("id", data.order_id);
    return { ok: true };
  });

export const listOrderProofs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: items } = await (context.supabase.from("payment_proofs" as never) as any)
      .select("*").eq("order_id", data.order_id).order("created_at", { ascending: false });
    return { items: items ?? [] };
  });

export const listPendingProofs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { data } = await (context.supabase.from("payment_proofs" as never) as any)
      .select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(200);
    return { items: data ?? [] };
  });

export const reviewPaymentProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    action: z.enum(["approve", "reject"]),
    review_note: z.string().max(500).optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await (context.supabase.from("payment_proofs" as never) as any).update({
      status: data.action === "approve" ? "approved" : "rejected",
      review_note: data.review_note ?? null,
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
