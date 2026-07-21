export const ADMIN_ORDER_STATUSES = [
  "draft",
  "new",
  "awaiting_seller",
  "accepted",
  "rejected",
  "packed",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "returned",
  "fulfilled",
] as const;

export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number];
export type OrderAction = "manage" | "mark_paid" | "refund" | "resolve_dispute";

const transitions: Record<AdminOrderStatus, readonly AdminOrderStatus[]> = {
  draft: ["new", "cancelled"],
  new: ["awaiting_seller", "accepted", "rejected", "cancelled"],
  awaiting_seller: ["accepted", "rejected", "cancelled"],
  accepted: ["packed", "cancelled"],
  rejected: [],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["completed", "returned"],
  completed: ["fulfilled", "returned"],
  cancelled: [],
  returned: [],
  fulfilled: [],
};

export function requiredOrderAction(from: AdminOrderStatus, to: AdminOrderStatus): OrderAction {
  void from;
  void to;
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
