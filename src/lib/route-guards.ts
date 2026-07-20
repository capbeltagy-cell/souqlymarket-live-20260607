import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Frontend route guard for administration screens.
 *
 * This improves navigation safety and UX. Server functions and RLS remain the
 * authoritative security boundary and must keep enforcing the same role.
 */
export async function requireAdminRoute() {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: (await supabase.auth.getUser()).data.user?.id ?? "",
    _role: "admin",
  });

  if (error || !data) {
    throw redirect({ to: "/dashboard", replace: true });
  }
}
