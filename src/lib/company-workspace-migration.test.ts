import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync(
  new URL(
    "../../supabase/migrations/20260723105000_company_workspace_dependencies.sql",
    import.meta.url,
  ),
  "utf8",
);
const identity = readFileSync(
  new URL(
    "../../supabase/migrations/20260727170000_harden_identity_tenant_integrity.sql",
    import.meta.url,
  ),
  "utf8",
);
const checkout = readFileSync(
  new URL("../../supabase/migrations/20260727173000_atomic_checkout_orders.sql", import.meta.url),
  "utf8",
);
const bundleBuilder = readFileSync(
  new URL("../../scripts/build-launch-bundle.mjs", import.meta.url),
  "utf8",
);

describe("company workspace migration dependencies", () => {
  it("installs tenant helpers before identity hardening uses them", () => {
    expect(workspace).toContain("CREATE TABLE IF NOT EXISTS public.company_members");
    expect(workspace).toContain("CREATE OR REPLACE FUNCTION public.has_company_permission");
    expect(identity).toContain("public.has_company_permission");
    expect(bundleBuilder.indexOf("20260723105000_company_workspace_dependencies.sql")).toBeLessThan(
      bundleBuilder.indexOf("20260727170000_harden_identity_tenant_integrity.sql"),
    );
  });

  it("supports both the legacy inventory schema and atomic listing inventory", () => {
    expect(workspace).toContain("ALTER COLUMN item_id DROP NOT NULL");
    expect(workspace).toContain("ALTER COLUMN quantity DROP NOT NULL");
    expect(workspace).toContain("ADD COLUMN IF NOT EXISTS listing_id");
    expect(workspace).toContain("ADD COLUMN IF NOT EXISTS quantity_delta");
    expect(workspace).toContain("REVOKE INSERT,UPDATE,DELETE ON public.inventory_movements");
    expect(checkout).toContain("INSERT INTO public.inventory_movements");
  });

  it("prevents negative stock and email-unbound invitation acceptance", () => {
    expect(workspace).toContain("IF current_balance<0");
    expect(workspace).toContain("RAISE EXCEPTION 'insufficient_inventory'");
    expect(workspace).toContain("invitation_email_mismatch");
    expect(workspace).toContain("extensions.digest(_token,'sha256')");
  });

  it("keeps public and anonymous roles away from privileged helpers", () => {
    expect(workspace).toContain(
      "REVOKE ALL ON FUNCTION public.has_company_permission(uuid,text,uuid) FROM PUBLIC,anon",
    );
    expect(workspace).toContain(
      "REVOKE ALL ON FUNCTION public.adjust_company_inventory(uuid,integer,text,uuid)",
    );
  });
});
