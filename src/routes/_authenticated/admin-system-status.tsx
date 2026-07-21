import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Database, KeyRound, Timer, Wrench } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { adminGetSystemStatus } from "@/lib/admin-core.functions";
import { BUILD_VERSION } from "@/lib/build-info";
import { requireAdminRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin-system-status")({
  beforeLoad: requireAdminRoute,
  head: () => ({ meta: [{ title: "حالة النظام — سوقلي" }] }),
  component: AdminSystemStatusPage,
});

type Status = Awaited<ReturnType<typeof adminGetSystemStatus>>;

function AdminSystemStatusPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminGetSystemStatus()
      .then(setStatus)
      .catch((caught: Error) => setError(caught.message));
  }, []);

  return (
    <AdminLayout
      title="حالة النظام"
      description="فحص آمن لاتصال الخدمات وإصدار التطبيق دون عرض أي أسرار."
      breadcrumbs={[{ label: "النظام" }, { label: "حالة النظام" }]}
      loading={!status && !error}
      error={error}
    >
      {status && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatusCard
            icon={Database}
            label="قاعدة البيانات"
            value={status.database === "healthy" ? "متصلة" : "خطأ"}
            healthy={status.database === "healthy"}
          />
          <StatusCard icon={KeyRound} label="المصادقة" value="متاحة" healthy />
          <StatusCard
            icon={Timer}
            label="زمن الفحص"
            value={`${status.responseMs} مللي ثانية`}
            healthy={status.responseMs < 2000}
          />
          <StatusCard
            icon={Wrench}
            label="وضع الصيانة"
            value={status.maintenanceMode ? "مفعّل" : "متوقف"}
            healthy={!status.maintenanceMode}
          />
          <StatusCard icon={Activity} label="بيئة التشغيل" value={status.environment} healthy />
          <StatusCard icon={Activity} label="إصدار البناء" value={BUILD_VERSION} healthy />
        </div>
      )}
    </AdminLayout>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  healthy,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  healthy: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <Badge variant={healthy ? "default" : "destructive"}>
          {healthy ? "سليم" : "يحتاج مراجعة"}
        </Badge>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
