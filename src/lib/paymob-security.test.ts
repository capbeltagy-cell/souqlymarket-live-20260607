import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildPaymobTransactionHmacInput,
  parseVerifiedPaymobTransaction,
  verifyPaymobTransactionHmac,
} from "./paymob-security.server";

const SECRET = "sandbox-hmac-secret";

function payload(overrides: Record<string, unknown> = {}) {
  return {
    type: "TRANSACTION",
    obj: {
      amount_cents: 49900,
      created_at: "2026-07-28T10:00:00Z",
      currency: "EGP",
      error_occured: false,
      has_parent_transaction: false,
      id: 9001,
      integration_id: 77,
      is_3d_secure: true,
      is_auth: false,
      is_capture: false,
      is_refunded: false,
      is_standalone_payment: true,
      is_voided: false,
      order: { id: 8001, merchant_order_id: "5bc3ce8d-7d48-4aba-9886-e25c3fef2258" },
      owner: 10,
      pending: false,
      source_data: { pan: "2346", sub_type: "MasterCard", type: "card" },
      success: true,
      ...overrides,
    },
  };
}

function sign(value: unknown) {
  return createHmac("sha512", SECRET).update(buildPaymobTransactionHmacInput(value)).digest("hex");
}

describe("Paymob webhook security", () => {
  it("accepts an intact signed transaction and exposes only sanitized financial fields", () => {
    const body = payload();
    expect(verifyPaymobTransactionHmac(body, sign(body), SECRET)).toBe(true);
    const parsed = parseVerifiedPaymobTransaction(body);
    expect(parsed.success).toBe(true);
    expect(parsed.amountCents).toBe(49900);
    expect(parsed.clientReference).toBe("5bc3ce8d-7d48-4aba-9886-e25c3fef2258");
    expect(parsed.sanitizedPayload).not.toHaveProperty("billing_data");
  });

  it("rejects an altered amount", () => {
    const body = payload();
    const signature = sign(body);
    const altered = payload({ amount_cents: 100 });
    expect(verifyPaymobTransactionHmac(altered, signature, SECRET)).toBe(false);
  });

  it("rejects invalid and malformed signatures", () => {
    const body = payload();
    expect(verifyPaymobTransactionHmac(body, "bad", SECRET)).toBe(false);
    expect(verifyPaymobTransactionHmac(body, "0".repeat(128), SECRET)).toBe(false);
  });

  it("generates a stable deduplication key for duplicate callbacks", () => {
    const first = parseVerifiedPaymobTransaction(payload());
    const duplicate = parseVerifiedPaymobTransaction(payload());
    expect(duplicate.eventKey).toBe(first.eventKey);
    expect(duplicate.payloadHash).toBe(first.payloadHash);
  });

  it("does not treat pending callbacks as successful payments", () => {
    const parsed = parseVerifiedPaymobTransaction(payload({ pending: true }));
    expect(parsed.success).toBe(false);
  });

  it("rejects callbacks without an internal order reference", () => {
    expect(() => parseVerifiedPaymobTransaction(payload({ order: { id: 8001 } }))).toThrow(
      "MISSING_CLIENT_REFERENCE",
    );
  });
});
