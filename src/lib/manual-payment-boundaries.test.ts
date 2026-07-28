import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20260728000300_manual_subscription_payments.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("manual subscription payment security boundaries", () => {
  it("keeps payment proofs private and owner-scoped", () => {
    expect(migration).toContain("'manual-payment-proofs'");
    expect(migration).toContain("public = false");
    expect(migration).toContain("(storage.foldername(name))[1] = auth.uid()::text");
  });

  it("does not grant users direct writes to payment requests", () => {
    expect(migration).toContain(
      "REVOKE ALL ON public.manual_payment_requests FROM PUBLIC, anon, authenticated",
    );
    expect(migration).not.toContain(
      "GRANT UPDATE ON public.manual_payment_requests TO authenticated",
    );
  });

  it("resolves amount and destination inside the database", () => {
    expect(migration).toContain("subscription_plan_price_egp");
    expect(migration).toContain("payment_methods pm");
    const signature = migration.match(
      /submit_manual_subscription_payment\(([\s\S]*?)\)\s*RETURNS uuid/i,
    )?.[1];
    expect(signature).toBeDefined();
    expect(signature).not.toContain("_amount");
  });

  it("requires admin role and locks the request during review", () => {
    expect(migration).toContain("NOT public.has_role(v_admin_id, 'admin')");
    expect(migration).toMatch(/manual_payment_requests[\s\S]*FOR UPDATE/);
  });

  it("performs activation, transaction, notification and audit in one RPC", () => {
    expect(migration).toContain("INSERT INTO public.payment_transactions");
    expect(migration).toContain("UPDATE public.companies");
    expect(migration).toContain("INSERT INTO public.notifications");
    expect(migration).toContain("INSERT INTO public.audit_logs");
  });

  it("requires rejection reason and permits a new request only after review", () => {
    expect(migration).toContain("REJECTION_REASON_REQUIRED");
    expect(migration).toContain("manual_payment_one_pending_per_company_idx");
    expect(migration).toContain("WHERE status = 'pending'");
  });
});
