import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  Building2,
  Clock,
  CreditCard,
  DollarSign,
  Loader2,
  UserPlus,
  Users,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { useI18n } from "@/i18n/I18nProvider";
import { getAdminExecutiveDashboard } from "@/lib/crm-analytics.functions";
import { formatPrice } from "@/lib/currency";
import { requireAdminRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin-executive")({
  beforeLoad: requireAdminRoute,
  head: () => ({ meta: [{ title: "Executive dashboard — Admin" }] }),
  component: AdminExecutivePage,
});

type Data = Awaited<ReturnType<typeof getAdminExecutiveDashboard>>;

function AdminExecutivePage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fetchData = useServerFn(getAdminExecutiveDashboard);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);

    fetchData()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      });

    return () => {
      active = false;
    };
  }, [fetchData]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">
              {ar ? "اللوحة التنفيذية" : "Executive dashboard"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {ar
                ? "ملخص سريع لأهم أرقام المنصة والنمو خلال آخر 30 يومًا."
                : "A concise view of platform performance and 30-day growth."}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!data && !error ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
            <Loader2 className="inline h-6 w-6 animate-spin" />
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={DollarSign}
                highlight
                label={ar ? "إجمالي الإيرادات" : "Total revenue"}
                value={formatPrice(data.totalRevenue, locale, { showZero: true })}
              />
              <MetricCard
                icon={CreditCard}
                label={ar ? "إيرادات الاشتراكات" : "Subscription revenue"}
                value={formatPrice(data.subscriptionRevenue, locale, { showZero: true })}
              />
              <MetricCard
                icon={Clock}
                label={ar ? "مدفوعات معلقة" : "Pending payouts"}
                value={formatPrice(data.pendingPayouts, locale, { showZero: true })}
              />
              <MetricCard
                icon={UserPlus}
                label={ar ? "تسجيلات جديدة (30 يوم)" : "New registrations (30d)"}
                value={String(data.newRegistrations)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                icon={Building2}
                label={ar ? "شركات نشطة" : "Active companies"}
                value={String(data.activeCompanies)}
              />
              <MetricCard
                icon={Users}
                label={ar ? "وكلاء نشطون" : "Active agents"}
                value={String(data.activeAgents)}
              />
              <MetricCard
                icon={UserPlus}
                label={ar ? "شركات / وكلاء جدد (30 يوم)" : "New companies / agents (30d)"}
                value={`${data.newCompanies30d} / ${data.newAgents30d}`}
              />
            </div>

            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 font-semibold">
                {ar ? "أفضل الفئات أداءً" : "Top performing categories"}
              </h2>
              {data.topCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {ar ? "لا توجد بيانات بعد" : "No data yet"}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {data.topCategories.map((category) => (
                    <div key={category.slug} className="rounded-lg border border-border p-4">
                      <div className="truncate text-xs uppercase text-muted-foreground">
                        {category.slug}
                      </div>
                      <div className="text-2xl font-bold">{category.leads}</div>
                      <div className="text-xs text-muted-foreground">{ar ? "طلبات" : "leads"}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-5 shadow-sm ${
        highlight ? "ring-2 ring-primary/60" : ""
      }`}
    >
      <Icon className="mb-3 h-5 w-5 text-primary" />
      <div className="break-words text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
