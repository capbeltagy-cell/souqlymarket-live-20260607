import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const TRANSACTION_HMAC_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const;

type JsonRecord = Record<string, unknown>;

export type VerifiedPaymobTransaction = {
  amountCents: number;
  clientReference: string;
  currency: string;
  eventKey: string;
  payloadHash: string;
  providerTransactionId: string;
  sanitizedPayload: JsonRecord;
  success: boolean;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPath(record: JsonRecord, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    return isRecord(current) ? current[key] : undefined;
  }, record);
}

function canonicalValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
}

export function buildPaymobTransactionHmacInput(payload: unknown): string {
  if (!isRecord(payload)) throw new Error("INVALID_PAYMOB_PAYLOAD");
  const object = isRecord(payload.obj) ? payload.obj : payload;
  return TRANSACTION_HMAC_FIELDS.map((field) => canonicalValue(getPath(object, field))).join("");
}

export function verifyPaymobTransactionHmac(
  payload: unknown,
  providedSignature: string,
  hmacSecret: string,
): boolean {
  if (!providedSignature || !hmacSecret || !/^[a-f0-9]{128}$/i.test(providedSignature))
    return false;
  const expected = createHmac("sha512", hmacSecret)
    .update(buildPaymobTransactionHmacInput(payload), "utf8")
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(providedSignature, "hex");
  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

function requiredString(value: unknown, code: string): string {
  if ((typeof value !== "string" && typeof value !== "number") || String(value).length === 0) {
    throw new Error(code);
  }
  return String(value);
}

function requiredInteger(value: unknown, code: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(code);
  return parsed;
}

function requiredBoolean(value: unknown, code: string): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(code);
}

export function parseVerifiedPaymobTransaction(payload: unknown): VerifiedPaymobTransaction {
  if (!isRecord(payload)) throw new Error("INVALID_PAYMOB_PAYLOAD");
  const object = isRecord(payload.obj) ? payload.obj : payload;
  const order = isRecord(object.order) ? object.order : {};
  const source = isRecord(object.source_data) ? object.source_data : {};
  const providerTransactionId = requiredString(object.id, "MISSING_TRANSACTION_ID");
  const clientReference = requiredString(
    order.merchant_order_id ?? order.special_reference,
    "MISSING_CLIENT_REFERENCE",
  );
  const amountCents = requiredInteger(object.amount_cents, "INVALID_AMOUNT");
  const currency = requiredString(object.currency, "MISSING_CURRENCY").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("INVALID_CURRENCY");
  const success = requiredBoolean(object.success, "INVALID_SUCCESS_STATUS");
  const pending = requiredBoolean(object.pending, "INVALID_PENDING_STATUS");
  const eventKey = `paymob:${providerTransactionId}:${success ? "success" : pending ? "pending" : "failed"}`;
  const sanitizedPayload: JsonRecord = {
    amount_cents: amountCents,
    currency,
    integration_id: canonicalValue(object.integration_id),
    pending,
    provider_transaction_id: providerTransactionId,
    source_type: canonicalValue(source.type),
    success,
  };
  const payloadHash = createHash("sha256")
    .update(JSON.stringify(sanitizedPayload), "utf8")
    .digest("hex");
  return {
    amountCents,
    clientReference,
    currency,
    eventKey,
    payloadHash,
    providerTransactionId,
    sanitizedPayload,
    success: success && !pending,
  };
}
