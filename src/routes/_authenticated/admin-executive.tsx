import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  DollarSign,
  Building2,
  Users,
  UserPlus,
  CreditCard,
  Clock,
  BarChart3,
  Loader2,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/currency";
import { getAdminExecutiveDashboard } from "@/lib/crm-analytics.functions";
import { requireAdminRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin-executive")({
  beforeLoad: requireAdminRoute,
  head: () => ({ meta: [{ title: "Executive dashboard — Admin" }] }),
  component: AdminExecutivePage,
});

type Data = Awaited<ReturnType<typeof getAdminExecutiveDashboard>>;

function AdminExecutivePage() {
  const { roles } = useAuth();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fetchData = useServerFn(getAdminExecutiveDashboard);
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!roles.includes("admin")) return;
    fetchData()
      .then(setD)
      .catch((e) => setErr((e as Error).message));
  }, [roles, fetchData]);

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
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{ar ? "اللوحة التنفيذية" : "Executive dashboard"}</h1>
        </div>
        {err && <div className="text-destructive mb-4">{err}</div>}
        {!d ? (
          <div className="p-10 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin inline" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card
                icon={DollarSign}
                highlight
                label={ar ? "إجمالي الإيرادات" : "Total revenue"}
                value={formatPrice(d.totalRevenue, locale, { showZero: true })}
              />
              <Card
                icon={CreditCard}
                label={ar ? "إيرادات الاشتراكات" : "Subscription revenue"}
                value={formatPrice(d.subscriptionRevenue, locale, { showZero: true })}
              />
              <Card
                icon={Clock}
                label={ar ? "مدفوعات معلقة" : "Pending payouts"}
                value={formatPrice(d.pendingPayouts, locale, { showZero: true })}
              />
              <Card
                icon={UserPlus}
                label={ar ? "تسجيلات جديدة (30 يوم)" : "New registrations (30d)"}
                value={String(d.newRegistrations)}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <Card
                icon={Building2}
                label={ar ? "شركات نشطة" : "Active companies"}
                value={String(d.activeCompanies)}
              />
              <Card
                icon={Users}
                label={ar ? "وكلاء نشطون" : "Active agents"}
                value={String(d.activeAgents)}
              />
              <Card
                icon={UserPlus}
                label={ar ? "شركات/وكلاء جدد (30 يوم)" : "New companies / agents (30d)"}
                value={`${d.newCompanies30d} / ${d.newAgents30d}`}
              />
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="font-semibold mb-4">
                {ar ? "أفضل الفئات" : "Top performing categories"}
              </h2>
              {d.topCategories.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {ar ? "لا توجد بيانات بعد" : "No data yet"}
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {d.topCategories.map((c) => (
                    <div key={c.slug} className="rounded border border-border p-4">
                      <div className="text-xs uppercase text-muted-foreground truncate">
                        {c.slug}
                      </div>
                      <div className="text-2xl font-bold">{c.leads}</div>
                      <div className="text-xs text-muted-foreground">{ar ? "طلبات" : "leads"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function Card({
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
      className={`rounded-lg border border-border bg-card p-5 shadow-card ${highlight ? "ring-2 ring-primary" : ""}`}
    >
      <Icon className="h-5 w-5 text-primary mb-2" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
