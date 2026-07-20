import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  BarChart3,
  Edit3,
  Eye,
  Loader2,
  Megaphone,
  Pause,
  Play,
  Square,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nProvider";
import { useMarketerGuard } from "@/hooks/useMarketerGuard";
import {
  listCompanyCampaigns,
  setListingPromotionStatus,
  type CompanyCampaignRow,
} from "@/lib/company-center.functions";

export const Route = createFileRoute("/_authenticated/company-campaigns")({
  head: () => ({ meta: [{ title: "حملات شركتي — Souqly" }] }),
  component: CompanyCampaignsPage,
});

function CompanyCampaignsPage() {
  useMarketerGuard();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fList = useServerFn(listCompanyCampaigns);
  const fSet = useServerFn(setListingPromotionStatus);
  const [rows, setRows] = useState<CompanyCampaignRow[]>([]);
  const [hasCompany, setHasCompany] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fList()
      .then((r) => {
        setRows(r.rows);
        setHasCompany(r.hasCompany);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, [fList]);

  const changeStatus = async (id: string, status: "active" | "paused" | "ended") => {
    setBusy(id);
    try {
      await fSet({ data: { id, status } });
      toast.success(ar ? "تم التحديث" : "Updated");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">
                {ar ? "مركز حملات الشركة" : "Company Campaign Center"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {ar
                  ? "منتجاتك المعروضة للمسوقين وأداؤها"
                  : "Your listings offered to marketers and their performance"}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/company-center">{ar ? "← مركز القيادة" : "← Command Center"}</Link>
          </Button>
        </div>

        {!hasCompany ? (
          <EmptyBox
            ar={ar}
            text={ar ? "أنشئ ملف شركتك أولاً." : "Create your company first."}
            cta={{ to: "/company", label: ar ? "إنشاء الشركة" : "Create company" }}
          />
        ) : loading ? (
          <div className="py-20 text-center text-muted-foreground">
            <Loader2 className="inline h-5 w-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyBox
            ar={ar}
            text={
              ar
                ? "لا توجد منتجات معروضة للتسويق بعد. فعّل خيار المسوقين على منتجاتك لجذب المسوقين."
                : "No listings offered to marketers yet. Enable marketer promotion on your listings."
            }
            cta={{ to: "/listings/new", label: ar ? "إضافة منتج" : "Add listing" }}
          />
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden divide-y divide-border">
            {rows.map((r) => {
              const canActivate = r.status === "approved";
              const title = ar ? r.title_ar || r.title_en : r.title_en || r.title_ar;
              return (
                <div key={r.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">{title}</span>
                        <StatusBadge status={r.status} />
                        <PromotionBadge status={r.promotion_status} />
                        <span className="text-xs text-muted-foreground">· {r.type}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {r.commission_type === "fixed"
                          ? ar
                            ? `عمولة ثابتة: ${r.commission_fixed_amount} ج.م`
                            : `Fixed: ${r.commission_fixed_amount} EGP`
                          : ar
                            ? `نسبة: ${r.commission_percentage}%`
                            : `${r.commission_percentage}%`}
                        {r.conversion_goal && (
                          <span className="ms-2">
                            · {ar ? "الهدف: " : "Goal: "}
                            {r.conversion_goal}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button asChild size="sm" variant="ghost" className="gap-1">
                        <Link to="/listings/$id" params={{ id: r.id }}>
                          <Eye className="h-4 w-4" />
                          {ar ? "عرض" : "View"}
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost" className="gap-1">
                        <Link to="/listings/$id/edit" params={{ id: r.id }}>
                          <Edit3 className="h-4 w-4" />
                          {ar ? "تعديل" : "Edit"}
                        </Link>
                      </Button>
                      {r.promotion_status === "active" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === r.id}
                          onClick={() => changeStatus(r.id, "paused")}
                          className="gap-1"
                        >
                          <Pause className="h-4 w-4" />
                          {ar ? "إيقاف" : "Pause"}
                        </Button>
                      ) : r.promotion_status === "paused" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === r.id || !canActivate}
                          onClick={() => changeStatus(r.id, "active")}
                          className="gap-1"
                        >
                          <Play className="h-4 w-4" />
                          {ar ? "تشغيل" : "Resume"}
                        </Button>
                      ) : null}
                      {r.promotion_status !== "ended" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === r.id}
                          onClick={() => {
                            if (confirm(ar ? "إنهاء العرض؟" : "End promotion?"))
                              changeStatus(r.id, "ended");
                          }}
                          className="gap-1 text-destructive"
                        >
                          <Square className="h-4 w-4" />
                          {ar ? "إنهاء" : "End"}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center">
                    <Metric
                      icon={Users}
                      label={ar ? "مسوقون" : "Marketers"}
                      value={r.participatingMarketers}
                    />
                    <Metric
                      icon={Megaphone}
                      label={ar ? "حملات نشطة" : "Active camps"}
                      value={r.activeCampaigns}
                    />
                    <Metric icon={BarChart3} label={ar ? "نقرات" : "Clicks"} value={r.clicks} />
                    <Metric icon={BarChart3} label={ar ? "طلبات" : "Leads"} value={r.leads} />
                    <Metric
                      icon={BarChart3}
                      label={ar ? "تحويلات" : "Conv"}
                      value={r.conversions}
                    />
                    <Metric
                      icon={Activity}
                      label={ar ? "معدل التحويل" : "CR"}
                      value={`${r.conversionRate}%`}
                    />
                    <Metric
                      icon={BarChart3}
                      label={ar ? "عمولات" : "Comm EGP"}
                      value={r.commissionsEgp.toFixed(0)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function EmptyBox({
  ar,
  text,
  cta,
}: {
  ar: boolean;
  text: string;
  cta: { to: string; label: string };
}) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-8 text-center">
      <p className="text-sm text-muted-foreground mb-3">{text}</p>
      <Button asChild className="bg-primary hover:bg-primary-hover">
        <Link to={cta.to}>{cta.label}</Link>
      </Button>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-2">
      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "approved"
      ? "bg-success/15 text-success"
      : status === "pending_review"
        ? "bg-warning/15 text-warning"
        : "bg-muted text-muted-foreground";
  return <Badge className={`${cls} border-0 text-[10px]`}>{status}</Badge>;
}
function PromotionBadge({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "bg-primary/15 text-primary"
      : status === "paused"
        ? "bg-warning/15 text-warning"
        : "bg-muted text-muted-foreground";
  return <Badge className={`${cls} border-0 text-[10px]`}>promo: {status}</Badge>;
}
