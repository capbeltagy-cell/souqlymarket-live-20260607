import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/i18n/I18nProvider";
import { getAdminOverview } from "@/lib/phase3.functions";

export const Route = createFileRoute("/_authenticated/admin-overview")({ component: AdminOverview });

function AdminOverview() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { getAdminOverview().then(setD).catch((e) => setErr(e.message)); }, []);

  if (err) return <div className="p-10 text-center text-destructive">{err}</div>;
  if (!d) return <div className="p-10 text-center">…</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1 space-y-8">
        <h1 className="text-3xl font-bold">{ar ? "لوحة الإدارة - نظرة عامة" : "Admin Overview"}</h1>
        <div>
          <h2 className="font-semibold mb-3">{ar ? "الشركات" : "Companies"}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label={ar ? "إجمالي الشركات" : "Total"} value={d.totals.companies} />
            <Stat label={ar ? "مدفوعة" : "Paid"} value={d.totals.paidCompanies} />
            <Stat label={ar ? "مجانية" : "Free"} value={d.totals.freeCompanies} />
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-3">{ar ? "النشاط" : "Activity"}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label={ar ? "إجمالي الطلبات" : "Total Leads"} value={d.totals.leads} />
            <Stat label="RFQs" value={d.totals.rfqs} />
            <Stat label={ar ? "المناقصات" : "Tenders"} value={d.totals.tenders} />
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-3">{ar ? "الإحالات" : "Referrals"}</h2>
          <div className="grid grid-cols-3 gap-3">
            <Stat label={ar ? "نقرات" : "Clicks"} value={d.referrals.clicks} />
            <Stat label={ar ? "تسجيلات" : "Signups"} value={d.referrals.signups} />
            <Stat label={ar ? "تحويلات" : "Conversions"} value={d.referrals.conversions} />
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-3">{ar ? "الإيرادات" : "Revenue"}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Stat label={ar ? "مدفوعة" : "Paid"} value={`${d.revenue.paid} ${d.revenue.currency}`} />
            <Stat label={ar ? "معلقة" : "Pending"} value={`${d.revenue.pending} ${d.revenue.currency}`} />
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return <div className="rounded-lg border border-border bg-card p-5 text-center shadow-card"><div className="text-3xl font-bold text-primary">{value}</div><div className="text-xs text-muted-foreground mt-1">{label}</div></div>;
}
