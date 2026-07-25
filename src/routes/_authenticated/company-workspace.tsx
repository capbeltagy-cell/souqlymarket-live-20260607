import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Boxes, Building2, ContactRound, Loader2, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { getMyCompanyWorkspace } from "@/lib/company-workspace.functions";

export const Route = createFileRoute("/_authenticated/company-workspace")({
  head: () => ({ meta: [{ title: "مساحة عمل الشركة — سوقلي" }] }),
  component: CompanyWorkspacePage,
});

type Payload = Awaited<ReturnType<typeof getMyCompanyWorkspace>>;

function CompanyWorkspacePage() {
  const fetchWorkspace = useServerFn(getMyCompanyWorkspace);
  const [payload, setPayload] = useState<Payload | null>(null);

  useEffect(() => {
    fetchWorkspace().then(setPayload);
  }, [fetchWorkspace]);

  if (!payload) {
    return (
      <PageShell>
        <Loader2 className="mx-auto mt-24 h-7 w-7 animate-spin text-primary" />
      </PageShell>
    );
  }
  if (!payload.hasWorkspace) {
    return (
      <PageShell>
        <div className="mx-auto mt-16 max-w-lg rounded-2xl border bg-card p-8 text-center">
          <Building2 className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">أنشئ شركتك أولًا</h1>
          <p className="mt-2 text-muted-foreground">
            مساحة العمل متاحة لمالك الشركة وأعضاء فريقه المعتمدين.
          </p>
          <Button asChild className="mt-5">
            <Link to="/company">إعداد ملف الشركة</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const { workspace, stats } = payload;
  const modules = [
    {
      title: "إدارة العملاء CRM",
      description: `${stats.leads} فرصة مسجلة`,
      icon: ContactRound,
      to: "/company-workspace/crm",
    },
    {
      title: "المخزون",
      description: `${stats.products} منتج · ${stats.lowStock} منخفض المخزون`,
      icon: Boxes,
      to: "/company-workspace/inventory",
    },
    {
      title: "أعضاء الشركة",
      description: `${stats.members} عضو نشط`,
      icon: Users,
      to: "/company-workspace/members",
    },
  ] as const;

  return (
    <PageShell>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">مساحة عمل الشركة</p>
          <h1 className="text-3xl font-bold">{workspace.companyName}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> صلاحيتك: {roleLabel(workspace.role)}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/company-center">مركز قيادة الشركة</Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {modules.map(({ title, description, icon: Icon, to }) => (
          <Link
            key={to}
            to={to}
            className="rounded-2xl border bg-card p-6 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40"
          >
            <Icon className="h-8 w-8 text-primary" />
            <h2 className="mt-5 text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}

function roleLabel(role: string) {
  return (
    (
      {
        owner: "المالك",
        admin: "مسؤول",
        manager: "مدير",
        sales: "مبيعات",
        inventory: "مخزون",
        viewer: "مشاهدة",
      } as Record<string, string>
    )[role] ?? role
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <SiteHeader />
      <main className="container-souqly flex-1 py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
