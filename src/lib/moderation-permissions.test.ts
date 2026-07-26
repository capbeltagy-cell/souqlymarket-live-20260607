import { describe, expect, it } from "vitest";

import { canModerate } from "./moderation-permissions";

describe("moderation permissions", () => {
  it("keeps read access separate from destructive actions", () => {
    const permissions = ["moderation.read"];

    expect(canModerate(permissions, "read")).toBe(true);
    expect(canModerate(permissions, "suspend")).toBe(false);
    expect(canModerate(permissions, "restore")).toBe(false);
  });

  it("allows explicit and wildcard permissions", () => {
    expect(canModerate(["moderation.suspend"], "suspend")).toBe(true);
    expect(canModerate(["*"], "restore")).toBe(true);
  });
});
