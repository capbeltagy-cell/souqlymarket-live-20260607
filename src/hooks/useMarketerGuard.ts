import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BUSINESS_ROLES, hasAnyRole, useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * Pure-marketer accounts (role=agent, not company/admin) cannot access
 * business/company creation routes. Redirect them to dashboard.
 */
export function useMarketerGuard() {
  const { roles, loading, user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading || !user) return;
    const isPureAgent =
      roles.includes("agent") &&
      !hasAnyRole(roles, BUSINESS_ROLES) &&
      !roles.includes("admin") &&
      !roles.includes("super_admin");
    if (isPureAgent) {
      toast.error("هذه الصفحة مخصصة للشركات فقط");
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, user, roles, navigate]);
}

export function isPureMarketer(roles: Parameters<typeof hasAnyRole>[0]): boolean {
  return (
    roles.includes("agent") &&
    !hasAnyRole(roles, BUSINESS_ROLES) &&
    !roles.includes("admin") &&
    !roles.includes("super_admin")
  );
}
