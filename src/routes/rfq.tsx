import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nProvider";
import { listRfqs } from "@/lib/phase3.functions";

export const Route = createFileRoute("/rfq")({
  head: () => ({ meta: [{ title: "طلبات عروض الأسعار — Souqly" }] }),
  component: RfqList,
});

function RfqList() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [rfqs, setRfqs] = useState<any[]>([]);
  useEffect(() => { listRfqs({ data: {} }).then((r) => setRfqs(r.rfqs)); }, []);
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold">{ar ? "طلبات عروض الأسعار (RFQ)" : "Requests for Quotation"}</h1>
            <p className="text-muted-foreground text-sm">{ar ? "اطلب عروض أسعار من شركات متعددة وقارن بينها" : "Request quotes from multiple companies"}</p>
          </div>
          <Button asChild className="bg-primary hover:bg-primary-hover"><Link to="/rfq/new">{ar ? "+ نشر طلب عرض سعر" : "+ New RFQ"}</Link></Button>
        </div>
        <div className="space-y-3">
          {rfqs.length === 0 && <div className="text-center text-muted-foreground py-12">{ar ? "لا توجد طلبات حالياً" : "No RFQs yet"}</div>}
          {rfqs.map((r) => (
            <Link key={r.id} to="/rfq/$id" params={{ id: r.id }} className="block rounded-lg border border-border bg-card p-5 hover:bg-muted shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold">{r.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                    {r.category_slug && <span className="rounded px-2 py-0.5 bg-muted">{r.category_slug}</span>}
                    {r.governorate && <span className="rounded px-2 py-0.5 bg-muted">{r.governorate}</span>}
                    {r.quantity && <span>{ar ? "الكمية:" : "Qty:"} {r.quantity} {r.unit ?? ""}</span>}
                    {(r.budget_min || r.budget_max) && <span>{ar ? "الميزانية:" : "Budget:"} {r.budget_min ?? "?"}–{r.budget_max ?? "?"} {r.currency}</span>}
                  </div>
                </div>
                <Badge variant={r.status === "open" ? "default" : "secondary"}>{r.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
