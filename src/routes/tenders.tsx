import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nProvider";
import { listTenders } from "@/lib/phase3.functions";

export const Route = createFileRoute("/tenders")({
  head: () => ({
    meta: [
      { title: "المناقصات والمشاريع — Souqly" },
      { name: "description", content: "مناقصات وفرص مشاريع فعلية للشركات والموردين على سوقلي." },
    ],
    links: [{ rel: "canonical", href: "https://souqlymarket.com/tenders" }],
  }),
  component: TendersList,
});

function TendersList() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [status, setStatus] = useState<"" | "open" | "closed" | "awarded">("");
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    listTenders({ data: { status: status || undefined } }).then((r) => setRows(r.tenders));
  }, [status]);
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              {ar ? "المناقصات والمشاريع" : "Tenders & Projects"}
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              {ar
                ? "انشر مناقصة واستقبل عروض الموردين"
                : "Publish a tender and receive supplier proposals"}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <Button asChild className="bg-primary hover:bg-primary-hover">
              <Link to="/tenders/new">{ar ? "+ مناقصة جديدة" : "+ New tender"}</Link>
            </Button>
            <div className="rounded-3xl bg-surface px-4 py-3 text-sm text-muted-foreground">
              {rows.length} {ar ? "مناقصة" : "tenders"}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["", "open", "closed", "awarded"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "default" : "outline"}
              onClick={() => setStatus(s)}
              className={status === s ? "bg-primary hover:bg-primary-hover" : ""}
            >
              {s || (ar ? "الكل" : "All")}
            </Button>
          ))}
        </div>
        <div className="grid gap-4">
          {rows.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              {ar ? "لا توجد مناقصات" : "No tenders"}
            </div>
          )}
          {rows.map((t) => (
            <Link
              key={t.id}
              to="/tenders/$id"
              params={{ id: t.id }}
              className="block rounded-[1.5rem] border border-border bg-surface-2 p-6 hover:bg-surface shadow-elev transition"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-xl">{t.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{t.description}</p>
                  <div className="flex flex-wrap gap-2 mt-4 text-sm text-muted-foreground">
                    {t.category_slug && (
                      <span className="rounded-2xl bg-white/5 px-3 py-1">{t.category_slug}</span>
                    )}
                    {t.governorate && (
                      <span className="rounded-2xl bg-white/5 px-3 py-1">{t.governorate}</span>
                    )}
                    {t.budget && (
                      <span>
                        {ar ? "الميزانية:" : "Budget:"} {t.budget} {t.currency}
                      </span>
                    )}
                    {t.deadline && (
                      <span>
                        {ar ? "ينتهي:" : "Deadline:"} {t.deadline}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-3 items-start sm:items-end">
                  <Badge variant={t.status === "open" ? "default" : "secondary"}>{t.status}</Badge>
                  <div className="text-sm text-muted-foreground">
                    {ar ? "قدم على العرض قبل:" : "Apply by:"} {t.deadline ?? "—"}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
