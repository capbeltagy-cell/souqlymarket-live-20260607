import { createFileRoute } from "@tanstack/react-router";
import { AdminPhase2ModulePage } from "@/components/AdminPhase2ModulePage";
import { requireAdminRoute } from "@/lib/route-guards";
export const Route = createFileRoute("/_authenticated/admin-disputes")({
  beforeLoad: requireAdminRoute,
  component: () => <AdminPhase2ModulePage module="disputes" />,
});
