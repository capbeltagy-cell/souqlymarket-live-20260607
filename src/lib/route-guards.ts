import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/useAuth";
import { ADMIN_ROLES, BUSINESS_ROLES } from "@/hooks/useAuth";

/**
 * Client-side navigation guard for administrator screens.
 *
 * This guard only protects route entry and user experience. Every sensitive
 * server function and database table must continue enforcing admin access via
 * server authorization and Supabase RLS/RPC policies.
 */
export async function requireAdminRoute() {
  return requireRoleRoute(ADMIN_ROLES, "/admin-overview");
}

export async function requireBusinessRoute() {
  return requireRoleRoute([...BUSINESS_ROLES, "admin", "super_admin"], "/company-center");
}

export async function requireAgentRoute() {
  return requireRoleRoute(["agent", "admin", "super_admin"], "/agent");
}

async function requireRoleRoute(allowedRoles: readonly AppRole[], returnTo: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw redirect({
      to: "/auth",
      search: { returnTo },
      replace: true,
    });
  }

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const authorized = (roleRows ?? []).some((row) => allowedRoles.includes(row.role));
  if (roleError || !authorized) {
    throw redirect({ to: "/dashboard", replace: true });
  }
}
