import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { hasPlatformAdminAccess } from "@/lib/admin-permissions";

/**
 * Client-side navigation guard for administrator screens.
 *
 * This guard only protects route entry and user experience. Every sensitive
 * server function and database table must continue enforcing admin access via
 * server authorization and Supabase RLS/RPC policies.
 */
export async function requireAdminRoute() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw redirect({
      to: "/auth",
      search: { returnTo: "/admin-overview" },
      replace: true,
    });
  }

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (roleError || !hasPlatformAdminAccess((roleRows ?? []).map((row) => row.role))) {
    throw redirect({ to: "/dashboard", replace: true });
  }
}
