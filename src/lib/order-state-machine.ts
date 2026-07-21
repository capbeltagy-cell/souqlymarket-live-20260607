export const ADMIN_ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "confirmed",
  "processing",
  "ready_to_ship",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "disputed",
  "refunded",
] as const;

export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number];
export type OrderAction = "manage" | "mark_paid" | "refund" | "resolve_dispute";

const transitions: Record<AdminOrderStatus, readonly AdminOrderStatus[]> = {
  pending_payment: ["paid", "cancelled", "disputed"],
  paid: ["confirmed", "cancelled", "disputed"],
  confirmed: ["processing", "cancelled", "disputed"],
  processing: ["ready_to_ship", "cancelled", "disputed"],
  ready_to_ship: ["shipped", "cancelled", "disputed"],
  shipped: ["delivered", "disputed"],
  delivered: ["completed", "disputed"],
  completed: ["disputed"],
  cancelled: [],
  disputed: ["refunded", "completed", "cancelled"],
  refunded: [],
};

export function requiredOrderAction(from: AdminOrderStatus, to: AdminOrderStatus): OrderAction {
  if (to === "paid") return "mark_paid";
  if (to === "refunded") return "refund";
  if (from === "disputed") return "resolve_dispute";
  return "manage";
}

export function canTransitionOrder(from: AdminOrderStatus, to: AdminOrderStatus): boolean {
  return transitions[from].includes(to);
}

export function assertOrderTransition(from: AdminOrderStatus, to: AdminOrderStatus): void {
  if (!canTransitionOrder(from, to)) {
    throw new Error(`Invalid order transition: ${from} -> ${to}`);
  }
}

export function hasOrderPermission(permissions: readonly string[], action: OrderAction): boolean {
  if (permissions.includes("*")) return true;
  const key: Record<OrderAction, string> = {
    manage: "orders.manage",
    mark_paid: "payments.manage",
    refund: "orders.refund",
    resolve_dispute: "orders.disputes",
  };
  return permissions.includes(key[action]);
}
