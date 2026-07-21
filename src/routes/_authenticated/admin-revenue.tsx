import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { LucideIcon } from "lucide-react";
import { CreditCard, DollarSign, Star, TrendingUp, Users } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/currency";
import { requireAdminRoute } from "@/lib/route-guards";
import { getAdminRevenueSummary } from "@/lib/wallets.functions";

export const Route = createFileRoute("/_authenticated/admin-revenue")({
  beforeLoad: requireAdminRoute,
  head: () => ({ meta: [{ title: "الإيرادات — لوحة الإدارة — سوقلي" }] }),
  component: AdminRevenuePage,
});

type RevenueSummary = {
  totalPaymentsRevenue: number;
  subscriptionRevenue: number;
  featuredRevenue: number;
  commissionRevenue: number;
  platformBalance: number;
  paidCommissions: number;
  activeSubscriptions: number;
  subsByPlan: Record<string, number>;
};

function AdminRevenuePage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fetchSummary = useServerFn(getAdminRevenueSummary);
  const [data, setData] = useState<RevenueSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setErr(null);

    fetchSummary()
      .then((result) => {
        if (active) setData(result as RevenueSummary);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setErr(
          error instanceof Error
            ? error.message
            : ar
              ? "تعذر تحميل الإيرادات"
              : "Unable to load revenue",
        );
      });

    return () => {
      active = false;
    };
  }, [ar, fetchSummary]);

  return (
    <AdminLayout
      title={ar ? "لوحة الإيرادات" : "Revenue Dashboard"}
      breadcrumbs={[{ label: ar ? "الإيرادات" : "Revenue" }]}
      loading={!data && !err}
      error={err}
    >
      {data && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card
              icon={DollarSign}
              label={ar ? "إجمالي الإيرادات" : "Total revenue"}
              value={formatPrice(data.totalPaymentsRevenue + data.commissionRevenue, locale, {
                showZero: true,
              })}
              highlight
            />
            <Card
              icon={CreditCard}
              label={ar ? "إيرادات الاشتراكات" : "Subscription revenue"}
              value={formatPrice(data.subscriptionRevenue, locale, { showZero: true })}
            />
            <Card
              icon={Star}
              label={ar ? "إيرادات الإعلانات المميزة" : "Featured revenue"}
              value={formatPrice(data.featuredRevenue, locale, { showZero: true })}
            />
            <Card
              icon={TrendingUp}
              label={ar ? "حصة المنصة من العمولات" : "Platform commission cut"}
              value={formatPrice(data.commissionRevenue, locale, { showZero: true })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card
              icon={DollarSign}
              label={ar ? "رصيد المنصة" : "Platform wallet balance"}
              value={formatPrice(data.platformBalance, locale, { showZero: true })}
            />
            <Card
              icon={TrendingUp}
              label={ar ? "عمولات مدفوعة" : "Paid commissions"}
              value={formatPrice(data.paidCommissions, locale, { showZero: true })}
            />
            <Card
              icon={Users}
              label={ar ? "اشتراكات نشطة" : "Active subscriptions"}
              value={String(data.activeSubscriptions)}
            />
          </div>

          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 font-semibold">
              {ar ? "الاشتراكات حسب الباقة" : "Subscriptions by plan"}
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Object.entries(data.subsByPlan).map(([plan, count]) => (
                <div key={plan} className="rounded-lg border border-border p-4">
                  <div className="text-xs uppercase text-muted-foreground">{plan}</div>
                  <div className="text-2xl font-bold">{count}</div>
                </div>
              ))}
              {Object.keys(data.subsByPlan).length === 0 && (
                <div className="text-sm text-muted-foreground">—</div>
              )}
            </div>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}

function Card({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-5 shadow-sm ${
        highlight ? "ring-2 ring-primary" : ""
      }`}
    >
      <Icon className="mb-2 h-5 w-5 text-primary" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
