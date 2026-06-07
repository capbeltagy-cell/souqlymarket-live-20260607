import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Briefcase, ClipboardList, Crown, DollarSign, FileText, Inbox, LayoutDashboard, Link2, PlusCircle, Settings, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { getMyCompanySubscription, type CompanySubscriptionInfo } from "@/lib/subscription.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Souqly" }] }),
  component: Dashboard,
});

type Counts = {
  listings: number; companies: number; agents: number;
  referrals: number; pendingCommissions: number; pendingListings: number;
};

function Dashboard() {
  const { user, roles } = useAuth();
  const { t, locale } = useI18n();
  const ar = locale === "ar";
  const role = roles.includes("admin") ? "admin" : roles.includes("company") ? "company" : "agent";
  const [counts, setCounts] = useState<Counts | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [sub, setSub] = useState<CompanySubscriptionInfo | null>(null);
  const fetchSub = useServerFn(getMyCompanySubscription);

  useEffect(() => {
    if (!user) return;
    (async () => {
      if (role === "admin") {
        const [l, c, a, p] = await Promise.all([
          supabase.from("listings").select("id", { count: "exact", head: true }),
          supabase.from("companies").select("id", { count: "exact", head: true }),
          supabase.from("agents").select("id", { count: "exact", head: true }),
          supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending"),
        ]);
        setCounts({ listings: l.count ?? 0, companies: c.count ?? 0, agents: a.count ?? 0, referrals: 0, pendingCommissions: 0, pendingListings: p.count ?? 0 });
      } else if (role === "company") {
        const subInfo = await fetchSub();
        setSub(subInfo);
        setHasProfile(subInfo.hasCompany);
        if (subInfo.companyId) {
          const { count: pc } = await supabase.from("commissions").select("id", { count: "exact", head: true }).eq("company_id", subInfo.companyId).eq("status", "pending");
          setCounts({ listings: subInfo.listingsCount, companies: 1, agents: 0, referrals: 0, pendingCommissions: pc ?? 0, pendingListings: 0 });
        } else {
          setCounts({ listings: 0, companies: 0, agents: 0, referrals: 0, pendingCommissions: 0, pendingListings: 0 });
        }
      } else {
        const { data: ag } = await supabase.from("agents").select("id").eq("user_id", user.id).maybeSingle();
        setHasProfile(!!ag);
        if (ag) {
          const [r, pc] = await Promise.all([
            supabase.from("referrals").select("id", { count: "exact", head: true }).eq("agent_id", ag.id),
            supabase.from("commissions").select("id", { count: "exact", head: true }).eq("agent_id", ag.id).eq("status", "pending"),
          ]);
          setCounts({ listings: 0, companies: 0, agents: 1, referrals: r.count ?? 0, pendingCommissions: pc.count ?? 0, pendingListings: 0 });
        } else {
          setCounts({ listings: 0, companies: 0, agents: 0, referrals: 0, pendingCommissions: 0, pendingListings: 0 });
        }
      }
    })();
  }, [user, role]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-primary" />
              {role === "admin" ? t("dashboard_admin_title") : role === "company" ? t("dashboard_company_title") : t("dashboard_agent_title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t("dashboard_welcome")}, {user?.email}</p>
          </div>
          <Badge variant="outline" className="capitalize">{role}</Badge>
        </div>

        {role === "company" && hasProfile === false && (
          <Onboard
            title={t("need_company_first")}
            body={t("create_company_to_list")}
            cta={{ label: t("create_company"), to: "/company" }}
          />
        )}
        {role === "agent" && hasProfile === false && (
          <Onboard
            title={t("create_agent")}
            body={t("create_agent")}
            cta={{ label: t("create_agent"), to: "/agent" }}
          />
        )}

        {!counts ? (
          <div className="py-20 text-center text-muted-foreground">{t("loading")}</div>
        ) : role === "admin" ? (
          <AdminDash counts={counts} />
        ) : role === "company" ? (
          <CompanyDash counts={counts} sub={sub} ar={ar} />
        ) : (
          <AgentDash counts={counts} />
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function Onboard({ title, body, cta }: { title: string; body: string; cta: { label: string; to: string } }) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 mb-6 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{body}</div>
      </div>
      <Button asChild className="bg-primary hover:bg-primary-hover">
        <Link to={cta.to}>{cta.label}</Link>
      </Button>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Briefcase; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="h-10 w-10 rounded-md bg-primary/10 text-primary grid place-items-center"><Icon className="h-5 w-5" /></div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function CompanyDash({ counts, sub, ar }: { counts: Counts; sub: CompanySubscriptionInfo | null; ar: boolean }) {
  const { t } = useI18n();
  const isPaid = sub?.isPaid ?? false;
  const limit = sub?.listingLimit ?? 5;
  const used = sub?.listingsCount ?? counts.listings;
  const pct = limit === -1 ? 100 : Math.min(100, Math.round((used / limit) * 100));
  const remaining = limit === -1 ? null : Math.max(0, limit - used);
  return (
    <>
      <div className={`rounded-lg border p-5 mb-6 ${isPaid ? "border-success/40 bg-success/5" : "border-primary/30 bg-primary/5"}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Crown className={`h-5 w-5 ${isPaid ? "text-success" : "text-primary"}`} />
            <div>
              <div className="font-semibold">
                {isPaid
                  ? (ar ? "اشتراك مدفوع نشط" : "Paid subscription active")
                  : (ar ? "الباقة المجانية" : "Free plan")}
              </div>
              <div className="text-xs text-muted-foreground">
                {isPaid
                  ? (sub?.expiresAt ? (ar ? `ينتهي في ${new Date(sub.expiresAt).toLocaleDateString()}` : `Expires ${new Date(sub.expiresAt).toLocaleDateString()}`) : (ar ? "بدون تاريخ انتهاء" : "No expiry"))
                  : (ar ? "أضف حتى 5 إعلانات مجاناً. اشترك بـ 499 ج.م شهرياً لإعلانات غير محدودة." : "Add up to 5 listings free. Subscribe for 499 EGP/mo for unlimited listings.")}
              </div>
            </div>
          </div>
          {!isPaid && (
            <Button asChild className="bg-primary hover:bg-primary-hover gap-2">
              <Link to="/subscribe"><Sparkles className="h-4 w-4" />{ar ? "ترقية إلى المدفوع" : "Upgrade — 499 EGP/mo"}</Link>
            </Button>
          )}
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium">{ar ? "الإعلانات المستخدمة" : "Listings used"}</span>
            <span className="text-muted-foreground">
              {used} / {limit === -1 ? "∞" : limit}
              {remaining !== null && remaining > 0 && (
                <span className="ms-2">· {ar ? `متبقي ${remaining}` : `${remaining} left`}</span>
              )}
              {remaining === 0 && (
                <span className="ms-2 text-warning">· {ar ? "وصلت للحد الأقصى" : "limit reached"}</span>
              )}
            </span>
          </div>
          <Progress value={pct} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat icon={FileText} label={t("total_listings")} value={String(counts.listings)} />
        <Stat icon={Inbox} label={ar ? "طلبات العملاء" : "Leads"} value={String(sub?.companyId ? (counts as Counts & { leads?: number }).leads ?? "—" : "—")} />
        <Stat icon={DollarSign} label={t("commissions_pending")} value={String(counts.pendingCommissions)} />
        <Stat icon={Users} label={t("active_referrals")} value={String(counts.referrals)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild className="bg-primary hover:bg-primary-hover gap-2"><Link to="/listings/new"><PlusCircle className="h-4 w-4" />{t("new_listing")}</Link></Button>
        <Button asChild variant="outline" className="gap-2"><Link to="/leads"><Inbox className="h-4 w-4" />{ar ? "الطلبات" : "Leads"}</Link></Button>
        <Button asChild variant="outline" className="gap-2"><Link to="/analytics"><Activity className="h-4 w-4" />{ar ? "الإحصائيات" : "Analytics"}</Link></Button>
        <Button asChild variant="outline"><Link to="/company">{t("nav_company_profile")}</Link></Button>
        <Button asChild variant="outline"><Link to="/commissions">{t("nav_commissions")}</Link></Button>
      </div>
    </>
  );
}

function AgentDash({ counts }: { counts: Counts }) {
  const { t } = useI18n();
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat icon={Link2} label={t("active_referrals")} value={String(counts.referrals)} />
        <Stat icon={DollarSign} label={t("commissions_pending")} value={String(counts.pendingCommissions)} />
        <Stat icon={Settings} label={t("nav_agent_profile")} value="—" />
        <Stat icon={ClipboardList} label={t("dashboard_referrals")} value={String(counts.referrals)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild className="bg-primary hover:bg-primary-hover"><Link to="/referrals">{t("create_referral")}</Link></Button>
        <Button asChild variant="outline"><Link to="/agent">{t("nav_agent_profile")}</Link></Button>
        <Button asChild variant="outline"><Link to="/commissions">{t("nav_commissions")}</Link></Button>
      </div>
    </>
  );
}

function AdminDash({ counts }: { counts: Counts }) {
  const { t } = useI18n();
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat icon={Briefcase} label={t("dashboard_companies")} value={String(counts.companies)} />
        <Stat icon={Users} label={t("nav_agents")} value={String(counts.agents)} />
        <Stat icon={FileText} label={t("total_listings")} value={String(counts.listings)} />
        <Stat icon={ClipboardList} label={t("dashboard_moderation")} value={String(counts.pendingListings)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="gap-2"><Link to="/verification"><ShieldCheck className="h-4 w-4" />{t("nav_verification")}</Link></Button>
        <Button asChild variant="outline" className="gap-2"><Link to="/admin-companies"><Crown className="h-4 w-4" />Companies</Link></Button>
        <Button asChild variant="outline"><Link to="/marketplace">{t("nav_marketplace")}</Link></Button>
      </div>
    </>
  );
}
