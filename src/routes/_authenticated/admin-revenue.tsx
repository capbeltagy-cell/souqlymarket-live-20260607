import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/currency";
import { getAdminRevenueSummary } from "@/lib/wallets.functions";
import { DollarSign, TrendingUp, Star, CreditCard, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin-revenue")({
  head: () => ({ meta: [{ title: "Revenue — Admin" }] }),
  component: AdminRevenuePage,
});

function AdminRevenuePage() {
  const { roles } = useAuth();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fetchSummary = useServerFn(getAdminRevenueSummary);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!roles.includes("admin")) return;
    fetchSummary().then(setData).catch((e) => setErr(e.message));
  }, [roles]);

  if (!roles.includes("admin")) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          {ar ? "للمسؤولين فقط" : "Admins only"}
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">
        <h1 className="text-2xl font-bold mb-6">{ar ? "لوحة الإيرادات" : "Revenue Dashboard"}</h1>
        {err && <div className="text-destructive mb-4">{err}</div>}
        {!data ? (
          <p className="text-muted-foreground">{ar ? "جاري التحميل..." : "Loading..."}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card icon={DollarSign} label={ar ? "إجمالي الإيرادات" : "Total revenue"} value={formatPrice(data.totalPaymentsRevenue + data.commissionRevenue, locale, { showZero: true })} highlight />
              <Card icon={CreditCard} label={ar ? "إيرادات الاشتراكات" : "Subscription revenue"} value={formatPrice(data.subscriptionRevenue, locale, { showZero: true })} />
              <Card icon={Star} label={ar ? "إيرادات الإعلانات المميزة" : "Featured revenue"} value={formatPrice(data.featuredRevenue, locale, { showZero: true })} />
              <Card icon={TrendingUp} label={ar ? "حصة المنصة من العمولات" : "Platform commission cut"} value={formatPrice(data.commissionRevenue, locale, { showZero: true })} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card icon={DollarSign} label={ar ? "رصيد المنصة" : "Platform wallet balance"} value={formatPrice(data.platformBalance, locale, { showZero: true })} />
              <Card icon={TrendingUp} label={ar ? "عمولات مدفوعة" : "Paid commissions"} value={formatPrice(data.paidCommissions, locale, { showZero: true })} />
              <Card icon={Users} label={ar ? "اشتراكات نشطة" : "Active subscriptions"} value={String(data.activeSubscriptions)} />
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-semibold mb-4">{ar ? "الاشتراكات حسب الباقة" : "Subscriptions by plan"}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(data.subsByPlan as Record<string, number>).map(([plan, count]) => (
                  <div key={plan} className="rounded border border-border p-4">
                    <div className="text-xs uppercase text-muted-foreground">{plan}</div>
                    <div className="text-2xl font-bold">{count}</div>
                  </div>
                ))}
                {Object.keys(data.subsByPlan).length === 0 && <div className="text-muted-foreground text-sm">—</div>}
              </div>
            </div>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function Card({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border border-border bg-card p-5 shadow-card ${highlight ? "ring-2 ring-primary" : ""}`}>
      <Icon className="h-5 w-5 text-primary mb-2" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
