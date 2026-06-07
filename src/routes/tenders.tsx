import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nProvider";
import { listTenders } from "@/lib/phase3.functions";

export const Route = createFileRoute("/tenders")({
  head: () => ({ meta: [{ title: "المناقصات والمشاريع — Souqly" }] }),
  component: TendersList,
});

function TendersList() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [status, setStatus] = useState<"" | "open" | "closed" | "awarded">("");
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { listTenders({ data: { status: status || undefined } }).then((r) => setRows(r.tenders)); }, [status]);
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">{ar ? "المناقصات والمشاريع" : "Tenders & Projects"}</h1>
            <p className="text-muted-foreground text-sm">{ar ? "انشر مناقصة واستقبل عروض الموردين" : "Publish a tender and receive supplier proposals"}</p>
          </div>
          <Button asChild className="bg-primary hover:bg-primary-hover"><Link to="/tenders/new">{ar ? "+ مناقصة جديدة" : "+ New tender"}</Link></Button>
        </div>
        <div className="flex gap-2 mb-4">
          {(["", "open", "closed", "awarded"] as const).map((s) => (
            <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)} className={status === s ? "bg-primary hover:bg-primary-hover" : ""}>{s || (ar ? "الكل" : "All")}</Button>
          ))}
        </div>
        <div className="space-y-3">
          {rows.length === 0 && <div className="text-center text-muted-foreground py-12">{ar ? "لا توجد مناقصات" : "No tenders"}</div>}
          {rows.map((t) => (
            <Link key={t.id} to="/tenders/$id" params={{ id: t.id }} className="block rounded-lg border border-border bg-card p-5 hover:bg-muted shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{t.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                  <div className="flex gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                    {t.category_slug && <span className="rounded px-2 py-0.5 bg-muted">{t.category_slug}</span>}
                    {t.governorate && <span className="rounded px-2 py-0.5 bg-muted">{t.governorate}</span>}
                    {t.budget && <span>{ar ? "الميزانية:" : "Budget:"} {t.budget} {t.currency}</span>}
                    {t.deadline && <span>{ar ? "ينتهي:" : "Deadline:"} {t.deadline}</span>}
                  </div>
                </div>
                <Badge variant={t.status === "open" ? "default" : "secondary"}>{t.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
