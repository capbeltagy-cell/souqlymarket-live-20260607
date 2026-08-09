import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const paymentMethodSchema = z.object({
  code: z.enum(["instapay", "vodafone_cash"]),
  nameAr: z.string().trim().min(2).max(80),
  nameEn: z.string().trim().min(2).max(80),
  number: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{10,15}$/),
  instructionsAr: z.string().trim().max(500),
  instructionsEn: z.string().trim().max(500),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(1000),
});

export type ManualPaymentMethod = z.infer<typeof paymentMethodSchema>;

const submitSchema = z.object({
  companyId: z.string().uuid(),
  paymentMethod: z.enum(["instapay", "vodafone_cash"]),
  senderPhone: z.string().regex(/^\+?[0-9]{10,15}$/),
  transferReference: z.string().trim().max(100).optional().nullable(),
  transferredAt: z.string().datetime(),
  proofPath: z.string().min(10).max(500),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type ManualPaymentRequest = {
  id: string;
  user_id: string;
  company_id: string;
  plan: string;
  amount_cents: number;
  currency: string;
  payment_method: "instapay" | "vodafone_cash";
  destination_number: string;
  sender_phone: string;
  transfer_reference: string | null;
  transferred_at: string;
  proof_path: string;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  proofUrl?: string | null;
  userName?: string | null;
  companyName?: string | null;
};

function isMissingMigration(message: string) {
  return /manual_payment_requests|submit_manual_subscription_payment|schema cache/i.test(message);
}

function toPaymentMethod(row: {
  account_details: unknown;
  code: string;
  instructions_ar: string | null;
  instructions_en: string | null;
  is_active: boolean;
  name_ar: string;
  name_en: string | null;
  sort_order: number;
}): ManualPaymentMethod | null {
  if (row.code !== "instapay" && row.code !== "vodafone_cash") return null;
  const details =
    row.account_details && typeof row.account_details === "object"
      ? (row.account_details as Record<string, unknown>)
      : {};
  const parsed = paymentMethodSchema.safeParse({
    code: row.code,
    instructionsAr: row.instructions_ar || "",
    instructionsEn: row.instructions_en || "",
    isActive: row.is_active,
    nameAr: row.name_ar,
    nameEn: row.name_en || row.name_ar,
    number: details.phone,
    sortOrder: row.sort_order,
  });
  return parsed.success ? parsed.data : null;
}

export const getManualPaymentCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => z.object({ companyId: z.string().uuid() }).parse(value))
  .handler(async ({ context, data }) => {
    const { data: company, error } = await context.supabase
      .from("companies")
      .select("id, name_ar, name_en, owner_id, subscription_plan")
      .eq("id", data.companyId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!company) throw new Error("لا يمكنك دفع اشتراك شركة لا تملكها");

    const { data: pricing } = await context.supabase.rpc("get_public_pricing" as never);
    const row = Array.isArray(pricing)
      ? (pricing[0] as { subscription_plan_price_egp?: number } | undefined)
      : undefined;
    const { data: methodRows, error: methodsError } = await supabaseAdmin
      .from("payment_methods")
      .select(
        "code, name_ar, name_en, instructions_ar, instructions_en, account_details, is_active, sort_order",
      )
      .in("code", ["instapay", "vodafone_cash"])
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (methodsError) throw new Error(methodsError.message);
    const methods = (methodRows ?? [])
      .map(toPaymentMethod)
      .filter(Boolean) as ManualPaymentMethod[];
    if (methods.length === 0) {
      throw new Error("لا توجد وسيلة دفع يدوية مفعلة حاليًا. تواصل مع الإدارة.");
    }

    return {
      amountEgp: Number(row?.subscription_plan_price_egp ?? 499),
      companyId: company.id,
      companyName: company.name_ar || company.name_en || "الشركة",
      methods,
    };
  });

export const adminGetManualPaymentMethods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _role: "admin",
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await supabaseAdmin
      .from("payment_methods")
      .select(
        "code, name_ar, name_en, instructions_ar, instructions_en, account_details, is_active, sort_order",
      )
      .in("code", ["instapay", "vodafone_cash"])
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return {
      methods: (data ?? []).map(toPaymentMethod).filter(Boolean) as ManualPaymentMethod[],
    };
  });

export const adminUpdateManualPaymentMethods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) =>
    z.object({ methods: z.array(paymentMethodSchema).length(2) }).parse(value),
  )
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _role: "admin",
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("Forbidden");
    if (new Set(data.methods.map((method) => method.code)).size !== 2) {
      throw new Error("يجب إعداد إنستا باي وفودافون كاش مرة واحدة لكل وسيلة");
    }
    for (const method of data.methods) {
      const { error } = await supabaseAdmin
        .from("payment_methods")
        .update({
          account_details: { phone: method.number },
          instructions_ar: method.instructionsAr,
          instructions_en: method.instructionsEn,
          is_active: method.isActive,
          name_ar: method.nameAr,
          name_en: method.nameEn,
          sort_order: method.sortOrder,
          updated_at: new Date().toISOString(),
        })
        .eq("code", method.code);
      if (error) throw new Error(error.message);
    }
    await supabaseAdmin.from("audit_logs").insert({
      action: "MANUAL_PAYMENT_METHODS_UPDATED",
      new_data: {
        methods: data.methods.map(({ code, isActive, number, sortOrder }) => ({
          code,
          isActive,
          number,
          sortOrder,
        })),
      },
      table_name: "payment_methods",
      user_id: context.userId,
    });
    return { ok: true };
  });

export const submitManualPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => submitSchema.parse(value))
  .handler(async ({ context, data }) => {
    if (!data.proofPath.startsWith(`${context.userId}/`)) {
      throw new Error("مسار إثبات الدفع غير صالح");
    }
    const transferredAt = new Date(data.transferredAt);
    const now = Date.now();
    if (
      !Number.isFinite(transferredAt.getTime()) ||
      transferredAt.getTime() > now + 10 * 60_000 ||
      transferredAt.getTime() < now - 7 * 24 * 60 * 60_000
    ) {
      throw new Error("وقت التحويل يجب أن يكون خلال آخر 7 أيام");
    }

    const { data: requestId, error } = await context.supabase.rpc(
      "submit_manual_subscription_payment" as never,
      {
        _company_id: data.companyId,
        _notes: data.notes || null,
        _payment_method: data.paymentMethod,
        _proof_path: data.proofPath,
        _sender_phone: data.senderPhone,
        _transfer_reference: data.transferReference || null,
        _transferred_at: data.transferredAt,
      } as never,
    );
    if (error) {
      if (isMissingMigration(error.message)) {
        throw new Error("الدفع اليدوي جاهز ويحتاج تطبيق تحديثات قاعدة البيانات على بيئة الاختبار");
      }
      throw new Error(error.message);
    }
    return { ok: true, requestId: String(requestId) };
  });

export const listMyManualPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("manual_payment_requests" as never)
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      if (isMissingMigration(error.message)) return { items: [], unavailable: true };
      throw new Error(error.message);
    }
    return { items: (data ?? []) as ManualPaymentRequest[], unavailable: false };
  });

export const adminListManualPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) =>
    z
      .object({
        status: z.enum(["all", "pending", "approved", "rejected"]).default("pending"),
        search: z.string().trim().max(100).default(""),
      })
      .parse(value),
  )
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _role: "admin",
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("Forbidden");

    let query = supabaseAdmin
      .from("manual_payment_requests" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) {
      if (isMissingMigration(error.message)) return { items: [], unavailable: true };
      throw new Error(error.message);
    }

    const requests = (rows ?? []) as ManualPaymentRequest[];
    const userIds = [...new Set(requests.map((item) => item.user_id))];
    const companyIds = [...new Set(requests.map((item) => item.company_id))];
    const [{ data: profiles }, { data: companies }] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from("profiles").select("id, full_name").in("id", userIds)
        : Promise.resolve({ data: [] }),
      companyIds.length
        ? supabaseAdmin.from("companies").select("id, name_ar, name_en").in("id", companyIds)
        : Promise.resolve({ data: [] }),
    ]);
    const profileMap = new Map((profiles ?? []).map((row) => [row.id, row.full_name]));
    const companyMap = new Map(
      (companies ?? []).map((row) => [row.id, row.name_ar || row.name_en]),
    );

    const enriched = await Promise.all(
      requests.map(async (request) => {
        const { data: signed } = await supabaseAdmin.storage
          .from("manual-payment-proofs")
          .createSignedUrl(request.proof_path, 300);
        return {
          ...request,
          companyName: companyMap.get(request.company_id) || null,
          proofUrl: signed?.signedUrl || null,
          userName: profileMap.get(request.user_id) || null,
        };
      }),
    );
    const term = data.search.toLocaleLowerCase("ar");
    return {
      items: term
        ? enriched.filter((item) =>
            [item.userName, item.companyName, item.sender_phone, item.transfer_reference]
              .filter(Boolean)
              .some((value) => String(value).toLocaleLowerCase("ar").includes(term)),
          )
        : enriched,
      unavailable: false,
    };
  });

export const reviewManualPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
        action: z.enum(["approve", "reject"]),
        rejectionReason: z.string().trim().max(500).optional().nullable(),
      })
      .superRefine((value, ctx) => {
        if (value.action === "reject" && (value.rejectionReason?.length ?? 0) < 3) {
          ctx.addIssue({
            code: "custom",
            message: "سبب الرفض مطلوب",
            path: ["rejectionReason"],
          });
        }
      })
      .parse(value),
  )
  .handler(async ({ context, data }) => {
    const { data: result, error } = await context.supabase.rpc(
      "review_manual_subscription_payment" as never,
      {
        _action: data.action,
        _rejection_reason: data.rejectionReason || null,
        _request_id: data.requestId,
      } as never,
    );
    if (error) {
      if (isMissingMigration(error.message)) {
        throw new Error("هذه الوحدة تحتاج تطبيق تحديثات قاعدة البيانات أولًا");
      }
      throw new Error(error.message);
    }
    return result as { result: "approved" | "rejected" | "already_reviewed" };
  });
