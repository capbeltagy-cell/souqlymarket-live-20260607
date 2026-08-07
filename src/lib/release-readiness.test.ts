import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

describe("release readiness contracts", () => {
  it("keeps every investor-demo destination registered", () => {
    const routeTree = read("src/routeTree.gen.ts");
    const destinations = [
      "/",
      "/marketplace",
      "/companies",
      "/stores",
      "/factories",
      "/real-estate",
      "/lands",
      "/wholesale",
      "/rfq",
      "/tenders",
      "/pricing",
      "/business-solutions",
      "/auth",
      "/cart",
      "/checkout",
      "/orders",
    ];

    for (const destination of destinations) {
      if (destination === "/") continue;
      expect(routeTree, `Missing route: ${destination}`).toContain(`'${destination}'`);
    }
  });

  it("runs the complete quality gate on the publish branch", () => {
    const workflow = read(".github/workflows/production-check.yml");

    expect(workflow).toContain("feat/multi-vendor-stores");
    expect(workflow).toContain("npm run typecheck");
    expect(workflow).toContain("npm run lint");
    expect(workflow).toContain("npm test");
    expect(workflow).toContain("npm run build");
  });

  it("keeps builder attribution out of the product interface", () => {
    const styles = read("src/styles.css");

    expect(styles).toContain('[aria-label="Edit with Lovable"]');
    expect(styles).toContain("display: none !important");
  });

  it("routes listing checkout through the atomic database boundary", () => {
    const orders = read("src/lib/orders.functions.ts");
    const checkout = read("supabase/migrations/20260727173000_atomic_checkout_orders.sql");

    expect(orders).toContain('"create_order_atomic"');
    expect(orders).not.toMatch(
      /from\("wholesale_orders" as never\)[\s\S]{0,120}\.insert\(insertPayload\)/,
    );
    expect(checkout).toContain("shipping_address_required");
    expect(checkout).toContain("listing_row.dimensions ->> 'shipping_required'");
    expect(checkout).toContain("p_checkout_session_id::text, NULL, NULL");
    expect(checkout).not.toContain("SET stock_quantity = inventory_balance");
  });

  it("prevents products from bypassing store approval", () => {
    const listings = read("src/lib/listings.functions.ts");

    expect(listings).toContain('data.status === "active" && store.status !== "published"');
    expect(listings).toContain('listingStatus === "approved" && store.status === "published"');
  });

  it("preserves scoped platform-admin roles in route guards", () => {
    const guards = read("src/lib/route-guards.ts");
    const permissions = read("src/lib/admin-permissions.ts");

    expect(guards).toContain("PLATFORM_ADMIN_ROLES");
    expect(permissions).toContain('"moderator"');
    expect(permissions).toContain('"finance_admin"');
    expect(permissions).toContain('"support_admin"');
  });

  it("keeps optional store categories from breaking the release migration", () => {
    const tenantMigration = read(
      "supabase/migrations/20260727170000_harden_identity_tenant_integrity.sql",
    );

    expect(tenantMigration).toContain("to_regclass('public.store_categories')");
    expect(tenantMigration).toContain("EXECUTE");
    expect(tenantMigration).toContain("store_categories_unavailable");
  });

  it("keeps financial evidence and notifications behind trusted boundaries", () => {
    const proofMigration = read(
      "supabase/migrations/20260729090000_private_order_payment_proofs.sql",
    );
    const hardening = read(
      "supabase/migrations/20260729105700_final_release_security_hardening.sql",
    );
    const orders = read("src/lib/orders.functions.ts");

    expect(proofMigration).toContain("SET search_path = ''");
    expect(hardening).toContain("REVOKE INSERT ON public.notifications FROM anon, authenticated");
    expect(orders).toContain('supabaseAdmin.from("notifications"');
    expect(hardening).toContain("trg_hide_unpublished_store_listings");
    expect(proofMigration).toContain("ranked_pending");
  });
});
