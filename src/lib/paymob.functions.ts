import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createPaymobIntention, getPaymobConfigurationStatus } from "@/lib/paymob-client.server";

const createPaymentSchema = z
  .object({
    companyId: z.string().uuid().nullable().optional(),
    idempotencyKey: z.string().uuid(),
    orderId: z.string().uuid().nullable().optional(),
    purpose: z.enum(["company_subscription", "marketplace_order"]),
  })
  .superRefine((value, context) => {
    if (value.purpose === "company_subscription" && !value.companyId) {
      context.addIssue({ code: "custom", message: "companyId is required" });
    }
    if (value.purpose === "marketplace_order" && !value.orderId) {
      context.addIssue({ code: "custom", message: "orderId is required" });
    }
  });

type PaymentAttempt = {
  amount_cents: number;
  client_reference: string;
  currency: string;
  purpose: string;
  status: string;
};

type PaymentStatus = {
  amount_cents: number;
  client_reference: string;
  created_at: string;
  currency: string;
  failure_code: string | null;
  purpose: string;
  status: string;
  verified_at: string | null;
};

function getClaimString(claims: Record<string, unknown>, key: string): string | null {
  const value = claims[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export const getOnlinePaymentStatus = createServerFn({ method: "GET" }).handler(async () => {
  const status = getPaymobConfigurationStatus();
  return { configured: status.configured };
});

export const createOnlinePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createPaymentSchema.parse(input))
  .handler(async ({ context, data }) => {
    const config = getPaymobConfigurationStatus();
    if (!config.configured) throw new Error("ONLINE_PAYMENT_NOT_CONFIGURED");

    const { data: rows, error } = await supabaseAdmin.rpc(
      "create_paymob_payment_attempt" as never,
      {
        _company_id: data.companyId ?? null,
        _idempotency_key: data.idempotencyKey,
        _order_id: data.orderId ?? null,
        _plan: data.purpose === "company_subscription" ? "premium_company" : null,
        _purpose: data.purpose,
        _user_id: context.userId,
      } as never,
    );
    if (error) throw new Error(error.message);
    const attempt = (Array.isArray(rows) ? rows[0] : rows) as unknown as PaymentAttempt | undefined;
    if (!attempt) throw new Error("PAYMENT_ATTEMPT_NOT_CREATED");
    if (attempt.status === "paid") {
      return {
        alreadyPaid: true,
        checkoutUrl: null,
        reference: attempt.client_reference,
      };
    }

    const profileResult = await context.supabase
      .from("profiles")
      .select("full_name, display_name")
      .eq("id", context.userId)
      .maybeSingle();
    const fullName =
      profileResult.data?.full_name || profileResult.data?.display_name || "Souqly User";
    const [firstName, ...lastNameParts] = fullName.trim().split(/\s+/);
    const email = getClaimString(context.claims as Record<string, unknown>, "email");
    if (!email) throw new Error("PAYMENT_EMAIL_REQUIRED");

    const intention = await createPaymobIntention({
      amountCents: Number(attempt.amount_cents),
      billing: {
        email,
        firstName: firstName || "Souqly",
        lastName: lastNameParts.join(" ") || "User",
      },
      clientReference: attempt.client_reference,
      currency: attempt.currency,
    });

    const attach = await supabaseAdmin.rpc(
      "attach_paymob_intention" as never,
      {
        _client_reference: attempt.client_reference,
        _provider_intention_id: intention.intentionId,
      } as never,
    );
    if (attach.error) throw new Error(attach.error.message);

    return {
      alreadyPaid: false,
      checkoutUrl: intention.checkoutUrl,
      reference: attempt.client_reference,
    };
  });

export const getMyOnlinePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ reference: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase.rpc(
      "get_my_payment_attempt" as never,
      { _client_reference: data.reference } as never,
    );
    if (error) throw new Error(error.message);
    const payment = (Array.isArray(rows) ? rows[0] : rows) as unknown as PaymentStatus | undefined;
    return { payment: payment ?? null };
  });
