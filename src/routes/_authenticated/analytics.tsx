import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Activity, BadgeCheck, Eye, Inbox, Loader2, MousePointerClick, TrendingUp } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nProvider";
import { getCompanyAnalytics } from "@/lib/phase2.functions";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Souqly" }] }),
  component: Analytics,
});

type Data = Awaited<ReturnType<typeof getCompanyAnalytics>>;

function Analytics() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fetchAnalytics = useServerFn(getCompanyAnalytics);
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => { fetchAnalytics().then(setData); }, [fetchAnalytics]);

  if (!data) return <Shell><div className="p-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div></Shell>;
  if (!data.hasCompany) {
    return (
      <Shell>
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-6 text-center">
          <p className="font-semibold">{ar ? "أنشئ ملف شركتك أولاً" : "Create your company profile first"}</p>
          <Link to="/company" className="text-primary underline mt-2 inline-block">{ar ? "إنشاء شركة" : "Create company"}</Link>
        </div>
      </Shell>
    );
  }

  const { totals, perListing, isVerified } = data;

  return (
    <Shell>
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{ar ? "الإحصائيات" : "Analytics"}</h1>
        </div>
        {isVerified && (
          <Badge className="gap-1 bg-primary text-primary-foreground"><BadgeCheck className="h-3 w-3" />{ar ? "موثقة" : "Verified"}</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Stat icon={Eye} label={ar ? "المشاهدات" : "Listing views"} value={totals.views} />
        <Stat icon={MousePointerClick} label={ar ? "النقرات" : "Clicks"} value={totals.clicks} />
        <Stat icon={Inbox} label={ar ? "الطلبات الواردة" : "Lead count"} value={totals.leads} />
        <Stat icon={BadgeCheck} label={ar ? "طلبات الوكلاء" : "Agent applications"} value={totals.agentApplications} />
        <Stat icon={TrendingUp} label={ar ? "معدل التحويل" : "Conversion rate"} value={`${totals.conversionRate}%`} />
      </div>

      <h2 className="font-semibold mb-3">{ar ? "أداء كل إعلان" : "Per-listing performance"}</h2>
      {perListing.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          {ar ? "لا توجد إعلانات بعد" : "No listings yet"}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-4 py-3 text-start">{ar ? "الإعلان" : "Listing"}</th>
                <th className="px-4 py-3 text-end">{ar ? "مشاهدات" : "Views"}</th>
                <th className="px-4 py-3 text-end">{ar ? "نقرات" : "Clicks"}</th>
                <th className="px-4 py-3 text-end">{ar ? "طلبات" : "Leads"}</th>
                <th className="px-4 py-3 text-end">{ar ? "تحويل" : "Conv."}</th>
                <th className="px-4 py-3 text-start">{ar ? "حالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {perListing.map((r) => {
                const conv = r.views_count > 0 ? Math.round((r.leads_count / r.views_count) * 1000) / 10 : 0;
                const featured = r.featured && (!r.featured_until || new Date(r.featured_until).getTime() > Date.now());
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <Link to="/listings/$id" params={{ id: r.id }} className="font-medium hover:text-primary">
                        {(ar ? r.title_ar : r.title_en) || r.title_en || r.title_ar}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-end font-mono">{r.views_count}</td>
                    <td className="px-4 py-3 text-end font-mono">{r.clicks_count}</td>
                    <td className="px-4 py-3 text-end font-mono">{r.leads_count}</td>
                    <td className="px-4 py-3 text-end font-mono">{conv}%</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {featured && <Badge className="bg-accent text-accent-foreground">★ {ar ? "مميز" : "Featured"}</Badge>}
                        <Badge variant="outline" className="capitalize">{r.status}</Badge>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="h-10 w-10 rounded-md bg-primary/10 text-primary grid place-items-center"><Icon className="h-5 w-5" /></div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
