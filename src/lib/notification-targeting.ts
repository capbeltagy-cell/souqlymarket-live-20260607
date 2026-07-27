export type NotificationTarget =
  | { kind: "user"; userId: string }
  | { kind: "company"; companyId: string }
  | { kind: "store"; storeId: string }
  | { kind: "role"; role: string }
  | { kind: "broadcast"; audience: "all" | "companies" | "agents" };

export function requiredNotificationPermission(target: NotificationTarget): string {
  return target.kind === "broadcast" || target.kind === "role"
    ? "notifications.broadcast"
    : "notifications.send";
}

export function canTargetNotification(
  permissions: readonly string[],
  target: NotificationTarget,
): boolean {
  return permissions.includes("*") || permissions.includes(requiredNotificationPermission(target));
}
