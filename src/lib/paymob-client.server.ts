import { z } from "zod";

const intentionResponseSchema = z.object({
  client_secret: z.string().min(1),
  id: z.union([z.string(), z.number()]).transform(String),
});

export type PaymobIntentionInput = {
  amountCents: number;
  billing: {
    email: string;
    firstName: string;
    lastName: string;
  };
  clientReference: string;
  currency: string;
};

export type PaymobIntentionResult = {
  checkoutUrl: string;
  clientSecret: string;
  intentionId: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`PAYMENT_CONFIGURATION_MISSING:${name}`);
  return value;
}

function paymentMethodIds(): number[] {
  const raw = [process.env.PAYMOB_CARD_INTEGRATION_ID, process.env.PAYMOB_WALLET_INTEGRATION_ID]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => Number(value));
  if (!raw.length || raw.some((value) => !Number.isSafeInteger(value) || value <= 0)) {
    throw new Error("PAYMENT_CONFIGURATION_MISSING:PAYMOB_INTEGRATION_IDS");
  }
  return raw;
}

export function getPaymobConfigurationStatus() {
  const paymentsEnabled = process.env.ENABLE_ONLINE_PAYMENTS === "true";
  const environment = process.env.PAYMOB_ENVIRONMENT?.trim();
  const missing = [
    "PAYMOB_SECRET_KEY",
    "PAYMOB_PUBLIC_KEY",
    "PAYMOB_HMAC_SECRET",
    "APP_BASE_URL",
  ].filter((name) => !process.env[name]?.trim());
  if (
    !process.env.PAYMOB_CARD_INTEGRATION_ID?.trim() &&
    !process.env.PAYMOB_WALLET_INTEGRATION_ID?.trim()
  ) {
    missing.push("PAYMOB_CARD_INTEGRATION_ID_OR_PAYMOB_WALLET_INTEGRATION_ID");
  }
  if (!paymentsEnabled) missing.push("ENABLE_ONLINE_PAYMENTS");
  if (environment !== "test" && environment !== "live") {
    missing.push("PAYMOB_ENVIRONMENT");
  }
  return { configured: missing.length === 0, environment, missing };
}

export async function createPaymobIntention(
  input: PaymobIntentionInput,
): Promise<PaymobIntentionResult> {
  const status = getPaymobConfigurationStatus();
  if (!status.configured) throw new Error("PAYMENT_CONFIGURATION_INCOMPLETE");
  const secretKey = requiredEnv("PAYMOB_SECRET_KEY");
  const publicKey = requiredEnv("PAYMOB_PUBLIC_KEY");
  const baseUrl = (process.env.PAYMOB_BASE_URL || "https://accept.paymob.com").replace(/\/+$/, "");
  const appBaseUrl = requiredEnv("APP_BASE_URL").replace(/\/+$/, "");

  const response = await fetch(`${baseUrl}/v1/intention/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountCents,
      billing_data: {
        apartment: "NA",
        building: "NA",
        city: "NA",
        country: "EG",
        email: input.billing.email,
        first_name: input.billing.firstName,
        floor: "NA",
        last_name: input.billing.lastName,
        phone_number: "NA",
        state: "NA",
        street: "NA",
      },
      currency: input.currency,
      extras: { souqly_reference: input.clientReference },
      items: [],
      notification_url: `${appBaseUrl}/api/paymob/webhook`,
      payment_methods: paymentMethodIds(),
      redirection_url: `${appBaseUrl}/payment-result?reference=${encodeURIComponent(input.clientReference)}`,
      special_reference: input.clientReference,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`PAYMOB_INTENTION_FAILED:${response.status}`);
  }
  const parsed = intentionResponseSchema.safeParse(body);
  if (!parsed.success) throw new Error("PAYMOB_INTENTION_INVALID_RESPONSE");

  return {
    checkoutUrl: `${baseUrl}/unifiedcheckout/?publicKey=${encodeURIComponent(publicKey)}&clientSecret=${encodeURIComponent(parsed.data.client_secret)}`,
    clientSecret: parsed.data.client_secret,
    intentionId: parsed.data.id,
  };
}
