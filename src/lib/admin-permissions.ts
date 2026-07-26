export const PLATFORM_ADMIN_ROLES = [
  "super_admin",
  "admin",
  "moderator",
  "finance_admin",
  "support_admin",
] as const;

export type PlatformAdminRole = (typeof PLATFORM_ADMIN_ROLES)[number];

export function isPlatformAdminRole(role: string): role is PlatformAdminRole {
  return PLATFORM_ADMIN_ROLES.includes(role as PlatformAdminRole);
}

export function hasPlatformAdminAccess(roles: readonly string[]): boolean {
  return roles.some(isPlatformAdminRole);
}

export function canManageFinance(roles: readonly string[]): boolean {
  return roles.some(
    (role) => role === "super_admin" || role === "admin" || role === "finance_admin",
  );
}

export function canManageRoles(roles: readonly string[]): boolean {
  return roles.some((role) => role === "super_admin" || role === "admin");
}

export function canRemoveRole(role: string, assignedCount: number): boolean {
  return role !== "super_admin" || assignedCount > 1;
}
