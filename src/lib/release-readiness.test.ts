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

    expect(orders).toContain('"create_order_atomic"');
    expect(orders).not.toMatch(
      /from\("wholesale_orders" as never\)[\s\S]{0,120}\.insert\(insertPayload\)/,
    );
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
});
