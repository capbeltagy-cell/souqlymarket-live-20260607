import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20260728000100_paymob_financial_boundaries.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("financial database boundaries", () => {
  it("removes direct subscription activation from authenticated users", () => {
    expect(migration).toContain(
      "REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated",
    );
    expect(migration).toContain('DROP POLICY IF EXISTS "Users create own subscription"');
    expect(migration).toContain('DROP POLICY IF EXISTS "Users update own subscription"');
  });

  it("resolves prices on the database side and rejects amount/currency mismatches", () => {
    expect(migration).toContain("create_paymob_payment_attempt");
    expect(migration).toContain("subscription_plan_price_egp");
    expect(migration).toContain("AMOUNT_OR_CURRENCY_MISMATCH");
  });

  it("deduplicates provider callbacks before financial activation", () => {
    expect(migration).toContain("provider_event_key text NOT NULL UNIQUE");
    expect(migration).toContain("ON CONFLICT (provider_event_key) DO NOTHING");
    expect(migration).toContain("RETURN jsonb_build_object('result', 'duplicate')");
  });

  it("keeps payment mutation RPCs service-role only", () => {
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.process_verified_paymob_event");
    expect(migration).toContain("TO service_role");
  });

  it("binds payout requests to owned wallets and payout methods", () => {
    expect(migration).toContain("PAYOUT_WALLET_OWNERSHIP_MISMATCH");
    expect(migration).toContain("PAYOUT_METHOD_OWNERSHIP_MISMATCH");
    expect(migration).toContain("PAYOUT_REQUEST_IMMUTABLE");
  });

  it("requires documented manual settlement before paid status", () => {
    expect(migration).toContain("PAYOUT_PROOF_REQUIRED");
    expect(migration).toContain("paid_reference");
    expect(migration).toContain("paid_proof_url");
  });
});
