import { describe, expect, it } from "vitest";
import {
  assertOrderTransition,
  canTransitionOrder,
  hasOrderPermission,
  requiredOrderAction,
} from "./order-state-machine";

describe("admin order state machine", () => {
  it("allows the normal fulfilment sequence", () => {
    expect(canTransitionOrder("new", "accepted")).toBe(true);
    expect(canTransitionOrder("accepted", "packed")).toBe(true);
    expect(canTransitionOrder("packed", "shipped")).toBe(true);
    expect(canTransitionOrder("shipped", "delivered")).toBe(true);
  });

  it("rejects impossible and terminal transitions", () => {
    expect(() => assertOrderTransition("cancelled", "completed")).toThrow();
    expect(() => assertOrderTransition("accepted", "shipped")).toThrow();
    expect(() => assertOrderTransition("fulfilled", "new")).toThrow();
  });

  it("requires finance permission to mark paid or refund", () => {
    expect(requiredOrderAction("new", "accepted")).toBe("manage");
    expect(hasOrderPermission(["orders.manage"], "mark_paid")).toBe(false);
    expect(hasOrderPermission(["payments.manage"], "mark_paid")).toBe(true);
    expect(hasOrderPermission(["orders.refund"], "refund")).toBe(true);
  });

  it("allows the wildcard only for super administrators", () => {
    expect(hasOrderPermission(["*"], "refund")).toBe(true);
  });
});
