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
});
