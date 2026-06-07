import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { getMyTenders } from "@/lib/phase3.functions";

export const Route = createFileRoute("/_authenticated/tenders/mine")({ component: MyTenders });

function MyTenders() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { getMyTenders().then((r) => setRows(r.tenders)); }, []);
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">{ar ? "مناقصاتي" : "My Tenders"}</h1>
          <Button asChild className="bg-primary hover:bg-primary-hover"><Link to="/tenders/new">{ar ? "+ جديد" : "+ New"}</Link></Button>
        </div>
        <div className="space-y-3">
          {rows.length === 0 && <div className="text-center text-muted-foreground py-12">{ar ? "لا توجد مناقصات" : "None yet"}</div>}
          {rows.map((t) => (
            <Link key={t.id} to="/tenders/$id" params={{ id: t.id }} className="block rounded-lg border border-border bg-card p-5 hover:bg-muted shadow-card">
              <div className="flex items-center justify-between gap-3"><div className="font-semibold">{t.title}</div><Badge>{t.status}</Badge></div>
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
