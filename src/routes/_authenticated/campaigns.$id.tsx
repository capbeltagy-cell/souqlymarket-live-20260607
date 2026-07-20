import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, MousePointerClick, TrendingUp, Percent } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/i18n/I18nProvider";
import { getCampaignAnalytics } from "@/lib/marketing.functions";

export const Route = createFileRoute("/_authenticated/campaigns/$id")({
  head: () => ({ meta: [{ title: "Campaign analytics — Marketing Center" }] }),
  component: CampaignAnalytics,
});

function CampaignAnalytics() {
  const { id } = Route.useParams();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fetchIt = useServerFn(getCampaignAnalytics);
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    fetchIt({ data: { id } }).then(setD);
  }, [id]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1 space-y-6">
        <Link
          to="/campaigns"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {ar ? "الحملات" : "Campaigns"}
        </Link>
        {!d ? (
          <div className="text-muted-foreground text-sm">…</div>
        ) : (
          <>
            <h1 className="text-2xl font-bold">{d.campaign?.name}</h1>
            <div className="grid grid-cols-3 gap-4">
              <Stat
                icon={MousePointerClick}
                label={ar ? "نقرات" : "Clicks"}
                value={String(d.clicks)}
              />
              <Stat
                icon={TrendingUp}
                label={ar ? "تحويلات" : "Conversions"}
                value={String(d.conversions)}
              />
              <Stat icon={Percent} label={ar ? "معدل التحويل" : "Rate"} value={`${d.rate}%`} />
            </div>
            <div className="rounded-lg border border-border bg-card p-5 shadow-card">
              <div className="font-semibold mb-3">{ar ? "روابط الحملة" : "Campaign links"}</div>
              {d.links.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  {ar ? "لا توجد روابط" : "No links yet"}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {d.links.map((r: any) => (
                    <div key={r.id} className="py-2 flex items-center justify-between text-sm">
                      <code className="text-xs">/r/{r.code}</code>
                      <span className="text-muted-foreground text-xs">
                        {r.clicks} {ar ? "نقرات" : "clicks"} · {r.conversions}{" "}
                        {ar ? "تحويلات" : "conv"}
                      </span>
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

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MousePointerClick;
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
