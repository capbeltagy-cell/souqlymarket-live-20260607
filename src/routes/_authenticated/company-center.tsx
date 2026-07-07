import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Activity, BarChart3, Building2, CheckCircle2, Circle, Crown, DollarSign, Eye, FileText, Inbox, LayoutDashboard, Loader2, Megaphone, PlusCircle, Settings, Sparkles, Users, Wallet } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/i18n/I18nProvider";
import { useMarketerGuard } from "@/hooks/useMarketerGuard";
import { getCompanyCommandCenter, type CommandCenterPayload } from "@/lib/company-center.functions";

export const Route = createFileRoute("/_authenticated/company-center")({
  head: () => ({ meta: [{ title: "مركز قيادة الشركة — Souqly" }] }),
  component: CommandCenter,
});

function CommandCenter() {
  useMarketerGuard();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const navigate = useNavigate();
  const fetchCC = useServerFn(getCompanyCommandCenter);
  const [d, setD] = useState<CommandCenterPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCC().then(setD).finally(() => setLoading(false));
  }, [fetchCC]);

  if (loading || !d) {
    return <Shell><div className="py-20 text-center text-muted-foreground"><Loader2 className="inline h-5 w-5 animate-spin" /></div></Shell>;
  }

  if (!d.hasCompany) {
    return (
      <Shell>
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
          <Building2 className="mx-auto h-8 w-8 text-primary mb-2" />
          <h2 className="text-xl font-bold mb-2">{ar ? "أنشئ ملف شركتك أولاً" : "Create your company first"}</h2>
          <p className="text-sm text-muted-foreground mb-4">{ar ? "لتتمكن من إدارة المنتجات والحملات والعمولات." : "So you can manage products, campaigns and commissions."}</p>
          <Button onClick={() => navigate({ to: "/company" })} className="bg-primary hover:bg-primary-hover">{ar ? "إنشاء الشركة" : "Create company"}</Button>
        </div>
      </Shell>
    );
  }

  const c = d.company!;
  const name = ar ? (c.name_ar || c.name_en) : (c.name_en || c.name_ar);
  const k = d.kpis;

  return (
    <Shell>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          {c.logo_url ? (
            <img src={c.logo_url} alt="" className="h-12 w-12 rounded-xl border border-border object-cover" />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-primary/10 grid place-items-center"><Building2 className="h-6 w-6 text-primary" /></div>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">{name || (ar ? "شركتي" : "My company")}
              {c.is_verified && <Badge className="bg-success/15 text-success border-0">{ar ? "موثقة" : "Verified"}</Badge>}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><LayoutDashboard className="h-3 w-3" />{ar ? "مركز قيادة الشركة" : "Company Command Center"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1"><Link to="/companies/$id" params={{ id: c.id }}><Eye className="h-4 w-4" />{ar ? "عرض الملف العام" : "Public profile"}</Link></Button>
        </div>
      </div>

      {/* Subscription banner */}
      <div className={`rounded-xl border p-4 mb-6 ${d.subscription.isPaid ? "border-success/40 bg-success/5" : "border-primary/30 bg-primary/5"}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Crown className={`h-5 w-5 ${d.subscription.isPaid ? "text-success" : "text-primary"}`} />
            <div>
              <div className="font-semibold">
                {d.subscription.isPaid ? (ar ? "اشتراك مدفوع نشط" : "Paid subscription active") : (ar ? "الباقة المجانية" : "Free plan")}
              </div>
              <div className="text-xs text-muted-foreground">
                {d.subscription.isPaid
                  ? (d.subscription.expiresAt ? (ar ? `ينتهي في ${new Date(d.subscription.expiresAt).toLocaleDateString()}` : `Expires ${new Date(d.subscription.expiresAt).toLocaleDateString()}`) : (ar ? "بدون تاريخ انتهاء" : "No expiry"))
                  : (ar ? "ترقّية لإعلانات غير محدودة (499 ج.م / شهر)" : "Upgrade for unlimited listings (499 EGP/mo)")}
              </div>
            </div>
          </div>
          {!d.subscription.isPaid && (
            <Button asChild size="sm" className="bg-primary hover:bg-primary-hover gap-1"><Link to="/subscribe"><Sparkles className="h-4 w-4" />{ar ? "ترقية" : "Upgrade"}</Link></Button>
          )}
        </div>
      </div>

      {/* Setup checklist */}
      {d.profileCompletion.pct < 100 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-card mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold">{ar ? "قائمة إعداد الشركة" : "Company setup checklist"}</div>
              <div className="text-xs text-muted-foreground">{ar ? `${d.profileCompletion.done} من ${d.profileCompletion.total} مكتملة` : `${d.profileCompletion.done} of ${d.profileCompletion.total} complete`}</div>
            </div>
            <div className="text-sm font-bold text-primary">{d.profileCompletion.pct}%</div>
          </div>
          <Progress value={d.profileCompletion.pct} className="mb-4" />
          <div className="grid sm:grid-cols-2 gap-2">
            {d.checklist.map((item) => (
              <Link key={item.key} to={item.ctaTo} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${item.done ? "border-success/30 bg-success/5 text-muted-foreground" : "border-border hover:border-primary/40 hover:bg-primary/5"}`}>
                {item.done ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                <span className={item.done ? "line-through" : ""}>{ar ? item.label_ar : item.label_en}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button asChild size="sm" className="bg-primary hover:bg-primary-hover gap-1"><Link to="/listings/new"><PlusCircle className="h-4 w-4" />{ar ? "إضافة منتج/خدمة" : "Add product/service"}</Link></Button>
        <Button asChild size="sm" variant="outline" className="gap-1"><Link to="/company-campaigns"><Megaphone className="h-4 w-4" />{ar ? "الحملات" : "Campaigns"}</Link></Button>
        <Button asChild size="sm" variant="outline" className="gap-1"><Link to="/leads"><Inbox className="h-4 w-4" />{ar ? "الطلبات" : "Leads"}</Link></Button>
        <Button asChild size="sm" variant="outline" className="gap-1"><Link to="/analytics"><BarChart3 className="h-4 w-4" />{ar ? "التحليلات" : "Analytics"}</Link></Button>
        <Button asChild size="sm" variant="outline" className="gap-1"><Link to="/wallet"><Wallet className="h-4 w-4" />{ar ? "المحفظة" : "Wallet"}</Link></Button>
        <Button asChild size="sm" variant="outline" className="gap-1"><Link to="/company"><Settings className="h-4 w-4" />{ar ? "الملف" : "Profile"}</Link></Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI icon={FileText} label={ar ? "منتجات نشطة" : "Active products"} value={k.activeProducts} />
        <KPI icon={FileText} label={ar ? "خدمات نشطة" : "Active services"} value={k.activeServices} />
        <KPI icon={Inbox} label={ar ? "إجمالي الطلبات" : "Total leads"} value={k.totalLeads} />
        <KPI icon={Inbox} label={ar ? "طلبات جديدة" : "New leads"} value={k.newLeads} accent />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI icon={Megaphone} label={ar ? "منتجات معروضة للتسويق" : "Promoted products"} value={k.activePromotedListings} />
        <KPI icon={Sparkles} label={ar ? "حملات مسوقين نشطة" : "Active campaigns"} value={k.activeCampaigns} />
        <KPI icon={Users} label={ar ? "مسوقون مشاركون" : "Marketers"} value={k.participatingMarketers} />
        <KPI icon={Activity} label={ar ? "معدل التحويل" : "Conversion rate"} value={`${k.conversionRate}%`} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KPI icon={BarChart3} label={ar ? "نقرات الروابط" : "Referral clicks"} value={k.referralClicks} />
        <KPI icon={BarChart3} label={ar ? "تحويلات" : "Conversions"} value={k.referralConversions} />
        <KPI icon={DollarSign} label={ar ? "عمولات مولّدة" : "Commissions generated"} value={`${k.totalCommissionsEgp.toFixed(0)} ج.م`} />
        <KPI icon={DollarSign} label={ar ? "عمولات معلّقة" : "Pending commissions"} value={`${k.pendingCommissionsEgp.toFixed(0)} ج.م`} />
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="p-4 border-b border-border font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          {ar ? "أحدث النشاط" : "Recent activity"}
        </div>
        {d.activity.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{ar ? "لا يوجد نشاط بعد" : "No activity yet"}</div>
        ) : (
          <div className="divide-y divide-border">
            {d.activity.map((a) => (
              <div key={a.id} className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${a.kind === "lead" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"}`}>
                    {a.kind === "lead" ? <Inbox className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm truncate">{ar ? a.title_ar : a.title_en}</div>
                    <div className="text-xs text-muted-foreground">{new Date(a.at).toLocaleString()}</div>
                  </div>
                </div>
                {a.link && (<Link to={a.link} className="text-xs text-primary hover:underline shrink-0">{ar ? "عرض" : "View"}</Link>)}
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

function KPI({ icon: Icon, label, value, accent }: { icon: typeof FileText; label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className="text-2xl font-bold">{value}</div>
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
