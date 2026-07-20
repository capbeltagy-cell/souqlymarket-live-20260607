import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Building2, User as UserIcon } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import {
  listVerificationQueue,
  setCompanyVerified,
  setAgentVerified,
} from "@/lib/verification.functions";
import { useAuth } from "@/hooks/useAuth";
import { requireAdminRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/verification")({
  beforeLoad: requireAdminRoute,
  head: () => ({ meta: [{ title: "طلبات التوثيق — سوقلي" }] }),
  component: VerificationPage,
});

function VerificationPage() {
  const { t, locale } = useI18n();
  const { roles } = useAuth();
  const fetchQueue = useServerFn(listVerificationQueue);
  const verifyCompany = useServerFn(setCompanyVerified);
  const verifyAgent = useServerFn(setAgentVerified);
  const [companies, setCompanies] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = roles.includes("admin");

  const load = async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchQueue();
      setCompanies(res.companies);
      setAgents(res.agents);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-2">
        <SiteHeader />
        <div className="container-souqly py-10 flex-1 text-center text-muted-foreground">
          Admin only
        </div>
        <SiteFooter />
      </div>
    );
  }

  const toggleC = async (id: string, v: boolean) => {
    try {
      await verifyCompany({ data: { id, verified: v } });
      toast.success(t("status_updated"));
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const toggleA = async (id: string, v: boolean) => {
    try {
      await verifyAgent({ data: { id, verified: v } });
      toast.success(t("status_updated"));
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <ShieldCheck className="h-6 w-6 text-primary" />
          {t("verification_title")}
        </h1>

        {loading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">{t("loading")}</div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            <Panel title={t("nav_companies")} icon={Building2}>
              {companies.length === 0 ? (
                <Empty />
              ) : (
                companies.map((c) => (
                  <Row
                    key={c.id}
                    title={locale === "ar" ? c.name_ar : c.name_en}
                    sub={`${c.industry ?? ""} · ${c.country ?? ""}`}
                    verified={c.is_verified}
                    onToggle={(v) => toggleC(c.id, v)}
                  />
                ))
              )}
            </Panel>
            <Panel title={t("nav_agents")} icon={UserIcon}>
              {agents.length === 0 ? (
                <Empty />
              ) : (
                agents.map((a) => (
                  <Row
                    key={a.id}
                    title={(locale === "ar" ? a.headline_ar : a.headline_en) ?? "—"}
                    sub={a.country ?? ""}
                    verified={a.is_verified}
                    onToggle={(v) => toggleA(a.id, v)}
                  />
                ))
              )}
            </Panel>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );

  function Row({
    title,
    sub,
    verified,
    onToggle,
  }: {
    title: string;
    sub: string;
    verified: boolean;
    onToggle: (v: boolean) => void;
  }) {
    return (
      <div className="p-4 flex items-center gap-3 border-b border-border last:border-0">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{title}</div>
          <div className="text-xs text-muted-foreground truncate">{sub}</div>
        </div>
        {verified ? (
          <Badge className="bg-success/10 text-success hover:bg-success/10">{t("verify")}</Badge>
        ) : (
          <Badge variant="outline">—</Badge>
        )}
        <Button
          size="sm"
          variant={verified ? "outline" : "default"}
          className={verified ? "" : "bg-primary hover:bg-primary-hover"}
          onClick={() => onToggle(!verified)}
        >
          {verified ? t("unverify") : t("verify")}
        </Button>
      </div>
    );
  }
  function Empty() {
    return <div className="p-6 text-center text-xs text-muted-foreground">—</div>;
  }
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Building2;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
      <div className="p-4 border-b border-border font-semibold flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}
