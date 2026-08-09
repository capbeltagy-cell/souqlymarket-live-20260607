import { describe, expect, it } from "vitest";
import { canUseFeature, featureFlags } from "./feature-flags";

describe("Souqly feature flags", () => {
  it("keeps existing production modules enabled", () => {
    expect(canUseFeature("affiliate_program")).toBe(true);
    expect(canUseFeature("wallets")).toBe(true);
    expect(canUseFeature("tenders")).toBe(true);
  });

  it("does not expose disabled or beta modules by default", () => {
    expect(featureFlags.auction_system).toBe("disabled");
    expect(canUseFeature("auction_system")).toBe(false);
    expect(canUseFeature("ai_tools")).toBe(false);
    expect(canUseFeature("ai_tools", { allowBeta: true })).toBe(true);
  });
});
