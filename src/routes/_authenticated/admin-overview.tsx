import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useI18n } from "@/i18n/I18nProvider";
import { getAdminOverview } from "@/lib/phase3.functions";
import { adminPhase2DashboardMetrics } from "@/lib/admin-phase2-ui.functions";
import { requireAdminRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin-overview")({
  beforeLoad: requireAdminRoute,
  component: AdminOverview,
});

function AdminOverview() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdminOverview>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase2, setPhase2] = useState<Record<string, number | null>>({});

  useEffect(() => {
    let active = true;

    getAdminOverview()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "تعذر تحميل بيانات لوحة الإدارة");
        }
      });
    adminPhase2DashboardMetrics()
      .then(setPhase2)
      .catch(() => setPhase2({}));

    return () => {
      active = false;
    };
  }, []);

  return (
    <AdminLayout
      title={ar ? "نظرة عامة" : "Admin overview"}
      breadcrumbs={[{ label: ar ? "لوحة الإدارة" : "Admin dashboard" }]}
      loading={!data && !error}
      error={error}
    >
      {data && (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">مؤشرات التشغيل والإدارة</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {Object.entries({
                orders: "الطلبات",
                disputes: "النزاعات",
                reports: "البلاغات",
                notifications: "الإشعارات",
                listings: "الإعلانات",
                stores: "المتاجر",
              }).map(([key, label]) => (
                <Stat key={key} label={label} value={phase2[key] ?? "—"} />
              ))}
            </div>
            {Object.values(phase2).some((value) => value === null) && (
              <p className="mt-2 text-sm text-amber-700">
                هذه الوحدة جاهزة وستعمل بعد تطبيق تحديثات قاعدة البيانات.
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              {ar ? "الشركات" : "Companies"}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat
                label={ar ? "إجمالي الشركات" : "Total companies"}
                value={data.totals.companies}
              />
              <Stat
                label={ar ? "الشركات المدفوعة" : "Paid companies"}
                value={data.totals.paidCompanies}
              />
              <Stat
                label={ar ? "الشركات المجانية" : "Free companies"}
                value={data.totals.freeCompanies}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              {ar ? "نشاط المنصة" : "Platform activity"}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat
                label={ar ? "إجمالي العملاء المحتملين" : "Total leads"}
                value={data.totals.leads}
              />
              <Stat label={ar ? "طلبات الشراء" : "RFQs"} value={data.totals.rfqs} />
              <Stat label={ar ? "المناقصات" : "Tenders"} value={data.totals.tenders} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              {ar ? "الإحالات" : "Referrals"}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat label={ar ? "النقرات" : "Clicks"} value={data.referrals.clicks} />
              <Stat label={ar ? "التسجيلات" : "Signups"} value={data.referrals.signups} />
              <Stat label={ar ? "التحويلات" : "Conversions"} value={data.referrals.conversions} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              {ar ? "الإيرادات" : "Revenue"}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Stat
                label={ar ? "المدفوع" : "Paid"}
                value={`${data.revenue.paid} ${data.revenue.currency}`}
              />
              <Stat
                label={ar ? "المعلق" : "Pending"}
                value={`${data.revenue.pending} ${data.revenue.currency}`}
              />
            </div>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-3xl font-bold text-blue-700">{value}</div>
      <div className="mt-1 text-sm text-gray-500">{label}</div>
    </div>
  );
}
