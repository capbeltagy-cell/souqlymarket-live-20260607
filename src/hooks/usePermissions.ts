import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "super_admin"
  | "admin"
  | "moderator"
  | "support"
  | "company"
  | "factory"
  | "service_provider"
  | "wholesaler"
  | "importer"
  | "exporter"
  | "agent"
  | "distributor"
  | "buyer"
  | "customer";

interface PermissionState {
  roles: AppRole[];
  permissions: Set<string>;
  loading: boolean;
  isAuthenticated: boolean;
  has: (permission: string) => boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
}

/**
 * Loads the current user's roles + flattened permission keys.
 * Falls back to an empty set when signed out so callers don't crash.
 */
export function usePermissions(): PermissionState {
  const { data, isLoading } = useQuery({
    queryKey: ["permissions", "current-user"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const user = session.session?.user;
      if (!user) return { roles: [] as AppRole[], permissions: [] as string[] };

      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const roles = (roleRows ?? []).map((r) => r.role as AppRole);

      if (roles.length === 0) return { roles, permissions: [] as string[] };

      const { data: permRows } = await supabase
        .from("role_permissions")
        .select("permission, role")
        .in("role", roles as unknown as string[]);

      const permissions = Array.from(
        new Set((permRows ?? []).map((p) => p.permission as string))
      );
      return { roles, permissions };
    },
  });

  const roles = (data?.roles ?? []) as AppRole[];
  const permissions = new Set<string>(data?.permissions ?? []);

  const has = (permission: string) =>
    permissions.has("*") || permissions.has(permission);
  const hasRole = (role: AppRole) => roles.includes(role);
  const hasAnyRole = (list: AppRole[]) => list.some((r) => roles.includes(r));

  return {
    roles,
    permissions,
    loading: isLoading,
    isAuthenticated: roles.length > 0 || isLoading,
    has,
    hasRole,
    hasAnyRole,
  };
}
