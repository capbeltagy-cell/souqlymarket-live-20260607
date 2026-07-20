import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
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
      roles.includes("agent") && !roles.includes("company") && !roles.includes("admin");
    if (isPureAgent) {
      toast.error("هذه الصفحة مخصصة للشركات فقط");
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, user, roles, navigate]);
}

export function isPureMarketer(roles: string[]): boolean {
  return roles.includes("agent") && !roles.includes("company") && !roles.includes("admin");
}
