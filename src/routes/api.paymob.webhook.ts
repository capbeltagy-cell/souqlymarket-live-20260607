import { createHash } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  parseVerifiedPaymobTransaction,
  verifyPaymobTransactionHmac,
} from "@/lib/paymob-security.server";

const MAX_WEBHOOK_BYTES = 256 * 1024;

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function recordRejected(bodyText: string, reason: string) {
  const payloadHash = createHash("sha256").update(bodyText, "utf8").digest("hex");
  await supabaseAdmin.rpc(
    "record_rejected_paymob_event" as never,
    {
      _payload_hash: payloadHash,
      _provider_event_key: `rejected:${payloadHash}:${reason}`,
      _reason_code: reason,
    } as never,
  );
}

export async function handlePaymobWebhook(request: Request): Promise<Response> {
  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (declaredLength > MAX_WEBHOOK_BYTES) return json(413, { ok: false });

  const bodyText = await request.text();
  if (Buffer.byteLength(bodyText, "utf8") > MAX_WEBHOOK_BYTES) {
    return json(413, { ok: false });
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return json(400, { ok: false });
  }

  const signature = new URL(request.url).searchParams.get("hmac") || "";
  const hmacSecret = process.env.PAYMOB_HMAC_SECRET || "";
  if (!verifyPaymobTransactionHmac(body, signature, hmacSecret)) {
    await recordRejected(bodyText, "INVALID_HMAC").catch(() => undefined);
    return json(401, { ok: false });
  }

  let event;
  try {
    event = parseVerifiedPaymobTransaction(body);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "INVALID_PAYLOAD";
    await recordRejected(bodyText, reason).catch(() => undefined);
    return json(422, { ok: false });
  }

  const { data, error } = await supabaseAdmin.rpc(
    "process_verified_paymob_event" as never,
    {
      _amount_cents: event.amountCents,
      _client_reference: event.clientReference,
      _currency: event.currency,
      _payload_hash: event.payloadHash,
      _provider_event_key: event.eventKey,
      _provider_transaction_id: event.providerTransactionId,
      _sanitized_payload: event.sanitizedPayload,
      _success: event.success,
    } as never,
  );
  if (error) {
    console.error("[Paymob webhook] processing failed", {
      code: error.code,
      eventKey: event.eventKey,
    });
    return json(500, { ok: false });
  }
  return json(200, { ok: true, result: data });
}

export const Route = createFileRoute("/api/paymob/webhook")({
  server: {
    handlers: {
      POST: ({ request }) => handlePaymobWebhook(request),
    },
  },
});
