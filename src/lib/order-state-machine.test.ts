import { describe, expect, it } from "vitest";
import {
  assertOrderTransition,
  canTransitionOrder,
  hasOrderPermission,
  requiredOrderAction,
} from "./order-state-machine";

describe("admin order state machine", () => {
  it("allows the normal fulfilment sequence", () => {
    expect(canTransitionOrder("paid", "confirmed")).toBe(true);
    expect(canTransitionOrder("confirmed", "processing")).toBe(true);
    expect(canTransitionOrder("processing", "ready_to_ship")).toBe(true);
    expect(canTransitionOrder("ready_to_ship", "shipped")).toBe(true);
    expect(canTransitionOrder("shipped", "delivered")).toBe(true);
  });

  it("rejects impossible and terminal transitions", () => {
    expect(() => assertOrderTransition("cancelled", "completed")).toThrow();
    expect(() => assertOrderTransition("paid", "shipped")).toThrow();
    expect(() => assertOrderTransition("refunded", "paid")).toThrow();
  });

  it("requires finance permission to mark paid or refund", () => {
    expect(requiredOrderAction("pending_payment", "paid")).toBe("mark_paid");
    expect(requiredOrderAction("disputed", "refunded")).toBe("refund");
    expect(hasOrderPermission(["orders.manage"], "mark_paid")).toBe(false);
    expect(hasOrderPermission(["payments.manage"], "mark_paid")).toBe(true);
    expect(hasOrderPermission(["orders.refund"], "refund")).toBe(true);
  });

  it("allows the wildcard only for super administrators", () => {
    expect(hasOrderPermission(["*"], "refund")).toBe(true);
  });
});
