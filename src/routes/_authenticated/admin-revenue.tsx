import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { LucideIcon } from "lucide-react";
import { CreditCard, DollarSign, Loader2, Star, TrendingUp, Users } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/currency";
import { requireAdminRoute } from "@/lib/route-guards";
import { getAdminRevenueSummary } from "@/lib/wallets.functions";

export const Route = createFileRoute("/_authenticated/admin-revenue")({
  beforeLoad: requireAdminRoute,
  head: () => ({ meta: [{ title: "Revenue — Admin" }] }),
  component: AdminRevenuePage,
});

type RevenueSummary = Awaited<ReturnType<typeof getAdminRevenueSummary>>;

function AdminRevenuePage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fetchSummary = useServerFn(getAdminRevenueSummary);
  const [data, setData] = useState<RevenueSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setErr(null);

    fetchSummary()
      .then((summary) => {
        if (!cancelled) setData(summary);
      })
      .catch((error: unknown) => {
        if (!cancelled) setErr(error instanceof Error ? error.message : "Failed to load revenue data");
      });

    return () => {
      cancelled = true;
    };
  }, [fetchSummary]);

  return (
    <AdminLayout
      title={ar ? "لوحة الإيرادات" : "Revenue dashboard"}
      description={ar ? "متابعة دخل المنصة والاشتراكات والعمولات" : "Track platform income, subscriptions and commissions"}
    >
      {err && (
        <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {err}
        </div>
      )}

      {!data ? (
        <div className="flex min-h-56 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={DollarSign}
              label={ar ? "إجمالي الإيرادات" : "Total revenue"}
              value={formatPrice(data.totalPaymentsRevenue + data.commissionRevenue, locale, { showZero: true })}
              highlight
            />
            <MetricCard
              icon={CreditCard}
              label={ar ? "إيرادات الاشتراكات" : "Subscription revenue"}
              value={formatPrice(data.subscriptionRevenue, locale, { showZero: true })}
            />
            <MetricCard
              icon={Star}
              label={ar ? "إيرادات الإعلانات المميزة" : "Featured revenue"}
              value={formatPrice(data.featuredRevenue, locale, { showZero: true })}
            />
            <MetricCard
              icon={TrendingUp}
              label={ar ? "حصة المنصة من العمولات" : "Platform commission cut"}
              value={formatPrice(data.commissionRevenue, locale, { showZero: true })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard
              icon={DollarSign}
              label={ar ? "رصيد المنصة" : "Platform wallet balance"}
              value={formatPrice(data.platformBalance, locale, { showZero: true })}
            />
            <MetricCard
              icon={TrendingUp}
              label={ar ? "عمولات مدفوعة" : "Paid commissions"}
              value={formatPrice(data.paidCommissions, locale, { showZero: true })}
            />
            <MetricCard
              icon={Users}
              label={ar ? "اشتراكات نشطة" : "Active subscriptions"}
              value={String(data.activeSubscriptions)}
            />
          </div>

          <section className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
            <h2 className="mb-4 font-semibold">{ar ? "الاشتراكات حسب الباقة" : "Subscriptions by plan"}</h2>
            {Object.keys(data.subsByPlan).length === 0 ? (
              <p className="text-sm text-muted-foreground">{ar ? "لا توجد اشتراكات نشطة" : "No active subscriptions"}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {Object.entries(data.subsByPlan).map(([plan, count]) => (
                  <div key={plan} className="rounded-lg border border-border bg-background/40 p-4">
                    <div className="truncate text-xs font-medium uppercase text-muted-foreground">{plan}</div>
                    <div className="mt-1 text-2xl font-bold">{count}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </AdminLayout>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 shadow-card ${highlight ? "ring-2 ring-primary" : ""}`}>
      <Icon className="mb-3 h-5 w-5 text-primary" />
      <div className="break-words text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
