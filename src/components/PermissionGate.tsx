import type { ReactNode } from "react";
import { usePermissions, type AppRole } from "@/hooks/usePermissions";

interface PermissionGateProps {
  /** Permission key required (e.g. "admin.access"). Omit to use role gating only. */
  permission?: string;
  /** Any of these roles is sufficient. */
  anyRole?: AppRole[];
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Renders children only when the current user has the given permission or role.
 * Use for UI-level gating (buttons, links, tabs). Route-level auth still uses
 * the `_authenticated` layout and per-route admin checks.
 */
export function PermissionGate({
  permission,
  anyRole,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { has, hasAnyRole, loading } = usePermissions();
  if (loading) return null;
  const ok =
    (permission ? has(permission) : true) &&
    (anyRole && anyRole.length > 0 ? hasAnyRole(anyRole) : true);
  return <>{ok ? children : fallback}</>;
}
