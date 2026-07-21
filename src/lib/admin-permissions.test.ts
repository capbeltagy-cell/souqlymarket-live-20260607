import { describe, expect, it } from "vitest";
import {
  canManageFinance,
  canManageRoles,
  hasPlatformAdminAccess,
  isPlatformAdminRole,
} from "./admin-permissions";

describe("admin permissions", () => {
  it("denies ordinary business roles", () => {
    expect(hasPlatformAdminAccess(["company", "agent", "customer"])).toBe(false);
  });

  it.each(["super_admin", "admin", "moderator", "finance_admin", "support_admin"])(
    "accepts the %s platform role",
    (role) => expect(isPlatformAdminRole(role)).toBe(true),
  );

  it("limits financial operations", () => {
    expect(canManageFinance(["finance_admin"])).toBe(true);
    expect(canManageFinance(["moderator"])).toBe(false);
    expect(canManageFinance(["support_admin"])).toBe(false);
  });

  it("limits role management to full administrators", () => {
    expect(canManageRoles(["super_admin"])).toBe(true);
    expect(canManageRoles(["admin"])).toBe(true);
    expect(canManageRoles(["finance_admin"])).toBe(false);
  });
});
