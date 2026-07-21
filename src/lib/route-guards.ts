import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

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
      search: { redirect: "/admin-overview" },
      replace: true,
    });
  }

  const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });

  if (roleError || !isAdmin) {
    throw redirect({ to: "/dashboard", replace: true });
  }
}
