import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  DollarSign,
  Inbox,
  Loader2,
  TrendingUp,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/currency";
import { getAgentPerformance } from "@/lib/crm-analytics.functions";

export const Route = createFileRoute("/_authenticated/agent-performance")({
  head: () => ({ meta: [{ title: "Agent performance — Souqly" }] }),
  component: AgentPerformancePage,
});

type Data = Awaited<ReturnType<typeof getAgentPerformance>>;

function AgentPerformancePage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fetchData = useServerFn(getAgentPerformance);
  const [d, setD] = useState<Data | null>(null);
  useEffect(() => {
    fetchData().then(setD);
  }, [fetchData]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{ar ? "أداء الوكيل" : "Agent performance"}</h1>
        </div>

        {!d ? (
          <div className="p-10 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin inline" />
          </div>
        ) : !d.hasAgent ? (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-6 text-center">
            <p className="font-semibold mb-2">
              {ar ? "أنشئ ملف الوكيل أولاً" : "Create your agent profile first"}
            </p>
            <Link to="/agent" className="text-primary underline">
              {ar ? "إنشاء ملف الوكيل" : "Create agent profile"}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <Stat
                icon={Inbox}
                label={ar ? "العملاء المحتملون" : "Leads generated"}
                value={String(d.leadsGenerated)}
              />
              <Stat
                icon={TrendingUp}
                label={ar ? "معدل التحويل" : "Conversion rate"}
                value={`${d.conversionRate}%`}
              />
              <Stat
                icon={DollarSign}
                label={ar ? "إجمالي العمولات" : "Total commissions"}
                value={formatPrice(d.totalCommissions, locale, { showZero: true })}
              />
              <Stat
                icon={Clock}
                label={ar ? "عمولات معلقة" : "Pending commissions"}
                value={formatPrice(d.pendingCommissions, locale, { showZero: true })}
              />
              <Stat
                icon={CheckCircle2}
                label={ar ? "عمولات مدفوعة" : "Paid commissions"}
                value={formatPrice(d.paidCommissions, locale, { showZero: true })}
              />
            </div>

            <h2 className="font-semibold mb-3">
              {ar ? "أفضل الإعلانات" : "Top referred listings"}
            </h2>
            {d.topListings.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
                {ar ? "لا توجد إحالات بعد" : "No referrals yet"}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2">
                    <tr>
                      <th className="px-4 py-3 text-start">{ar ? "الإعلان" : "Listing"}</th>
                      <th className="px-4 py-3 text-end">{ar ? "نقرات" : "Clicks"}</th>
                      <th className="px-4 py-3 text-end">{ar ? "تحويلات" : "Conversions"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.topListings.map((l) => (
                      <tr key={l.id} className="border-t border-border">
                        <td className="px-4 py-3">
                          <Link
                            to="/listings/$id"
                            params={{ id: l.id }}
                            className="text-primary hover:underline"
                          >
                            {l.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-end">{l.clicks}</td>
                        <td className="px-4 py-3 text-end">{l.conversions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card">
      <Icon className="h-5 w-5 text-primary mb-2" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
