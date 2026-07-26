export type ModerationAction = "read" | "manage" | "suspend" | "restore";

const permissionByAction: Record<ModerationAction, string> = {
  read: "moderation.read",
  manage: "moderation.manage",
  suspend: "moderation.suspend",
  restore: "moderation.restore",
};

export function canModerate(permissions: readonly string[], action: ModerationAction): boolean {
  return permissions.includes("*") || permissions.includes(permissionByAction[action]);
}
