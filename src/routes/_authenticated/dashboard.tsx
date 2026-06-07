import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, CheckCircle2, ClipboardList, DollarSign, Eye, FileText, LayoutDashboard, Link2, Settings, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { sampleAgents, sampleCompanies, sampleListings } from "@/lib/sampleData";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Souqly" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, roles } = useAuth();
  const { t } = useI18n();
  const role = roles.includes("admin") ? "admin" : roles.includes("company") ? "company" : "agent";

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-primary" />
              {role === "admin" ? t("dashboard_admin_title") : role === "company" ? t("dashboard_company_title") : t("dashboard_agent_title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t("dashboard_welcome")}, {user?.email}</p>
          </div>
          <Badge variant="outline" className="capitalize">{role}</Badge>
        </div>

        {role === "company" && <CompanyDash />}
        {role === "agent" && <AgentDash />}
        {role === "admin" && <AdminDash />}
      </div>
      <SiteFooter />
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Briefcase; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="h-10 w-10 rounded-md bg-primary/10 text-primary grid place-items-center"><Icon className="h-5 w-5" /></div>
        {hint && <span className="text-xs text-success">{hint}</span>}
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold">{title}</h3>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}

function CompanyDash() {
  const { t } = useI18n();
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat icon={FileText} label={t("total_listings")} value="24" hint="+3" />
        <Stat icon={Eye} label="Views (30d)" value="12,847" hint="+18%" />
        <Stat icon={Users} label={t("active_referrals")} value="47" />
        <Stat icon={DollarSign} label={t("total_earnings")} value="$84,210" hint="+12%" />
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Section
            title={t("dashboard_listings")}
            action={<Button size="sm" className="bg-primary hover:bg-primary-hover">{t("new_listing")}</Button>}
          >
            <div className="divide-y divide-border">
              {sampleListings.slice(0, 5).map((l) => (
                <div key={l.id} className="p-4 flex items-center gap-4">
                  <img src={l.image} alt="" className="h-14 w-14 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{l.title_en}</div>
                    <div className="text-xs text-muted-foreground">{t(`cat_${l.type}` as never)} • ${l.price.toLocaleString()}</div>
                  </div>
                  <Badge variant="secondary">{t("commission")} {l.commission}%</Badge>
                </div>
              ))}
            </div>
          </Section>
        </div>
        <Section title={t("dashboard_applications")}>
          <div className="divide-y divide-border">
            {sampleAgents.slice(0, 4).map((a) => (
              <div key={a.id} className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-accent text-accent-foreground grid place-items-center font-bold">{a.initial}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{a.name_en}</div>
                  <div className="text-xs text-muted-foreground truncate">{a.headline_en}</div>
                </div>
                <Button size="sm" variant="outline">Review</Button>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}

function AgentDash() {
  const { t } = useI18n();
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat icon={Link2} label={t("active_referrals")} value="18" hint="+2" />
        <Stat icon={TrendingUp} label="Clicks (30d)" value="4,210" hint="+24%" />
        <Stat icon={CheckCircle2} label="Conversions" value="63" />
        <Stat icon={DollarSign} label={t("total_earnings")} value="$12,480" hint="+9%" />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Section
          title={t("dashboard_referrals")}
          action={<Button size="sm" variant="outline">Browse companies</Button>}
        >
          <div className="divide-y divide-border">
            {sampleListings.slice(0, 5).map((l) => (
              <div key={l.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{l.title_en}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{l.company_en}</div>
                  </div>
                  <Badge variant="secondary">{l.commission}%</Badge>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <code className="rounded bg-muted px-2 py-1 truncate flex-1">souqly.com/r/{l.id}-ABCD</code>
                  <Button size="sm" variant="ghost">Copy</Button>
                </div>
              </div>
            ))}
          </div>
        </Section>
        <Section title={t("dashboard_commissions")}>
          <div className="divide-y divide-border">
            {sampleListings.slice(0, 5).map((l, i) => (
              <div key={l.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{l.title_en}</div>
                  <div className="text-xs text-muted-foreground">{["2 days ago","5 days ago","1 week ago","2 weeks ago","1 month ago"][i]}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-success">${(l.price * l.commission / 100).toLocaleString()}</div>
                  <Badge variant={i === 0 ? "secondary" : "outline"} className="text-xs">{i === 0 ? "Pending" : "Paid"}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}

function AdminDash() {
  const { t } = useI18n();
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat icon={Users} label={t("dashboard_users")} value="11,247" hint="+8%" />
        <Stat icon={Briefcase} label={t("dashboard_companies")} value="2,418" hint="+12%" />
        <Stat icon={ClipboardList} label="Pending" value="34" />
        <Stat icon={DollarSign} label="Platform MRR" value="$94,820" hint="+18%" />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title={t("dashboard_moderation")}>
          <div className="divide-y divide-border">
            {sampleListings.slice(0, 5).map((l) => (
              <div key={l.id} className="p-4 flex items-center gap-4">
                <img src={l.image} alt="" className="h-12 w-12 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{l.title_en}</div>
                  <div className="text-xs text-muted-foreground">{l.company_en}</div>
                </div>
                <Button size="sm" variant="outline" className="text-success">Approve</Button>
                <Button size="sm" variant="outline" className="text-destructive">Reject</Button>
              </div>
            ))}
          </div>
        </Section>
        <Section title={t("dashboard_companies")}>
          <div className="divide-y divide-border">
            {sampleCompanies.slice(0, 5).map((c) => (
              <div key={c.id} className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-md hero-gradient text-primary-foreground grid place-items-center font-bold">{c.initial}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm flex items-center gap-1 truncate">
                    {c.name_en}{c.verified && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{c.industry_en} • {c.listings} listings</div>
                </div>
                <Button size="sm" variant="ghost"><Settings className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}
