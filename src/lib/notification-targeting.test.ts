import { describe, expect, it } from "vitest";
import { canTargetNotification, requiredNotificationPermission } from "./notification-targeting";

describe("notification targeting", () => {
  it("separates direct sending from broadcasts", () => {
    expect(requiredNotificationPermission({ kind: "user", userId: crypto.randomUUID() })).toBe(
      "notifications.send",
    );
    expect(requiredNotificationPermission({ kind: "broadcast", audience: "all" })).toBe(
      "notifications.broadcast",
    );
  });

  it("prevents send-only admins from broadcasting", () => {
    expect(
      canTargetNotification(["notifications.send"], { kind: "broadcast", audience: "all" }),
    ).toBe(false);
    expect(
      canTargetNotification(["notifications.broadcast"], {
        kind: "broadcast",
        audience: "companies",
      }),
    ).toBe(true);
  });
});
