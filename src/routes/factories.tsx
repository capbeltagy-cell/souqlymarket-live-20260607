import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nProvider";
import { listFactories } from "@/lib/phase3.functions";

export const Route = createFileRoute("/factories")({
  head: () => ({ meta: [{ title: "دليل المصانع المصرية — Souqly" }, { name: "description", content: "دليل شامل للمصانع في مصر" }] }),
  component: FactoriesList,
});

function FactoriesList() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [verified, setVerified] = useState(false);
  const [exportOnly, setExportOnly] = useState(false);
  const [gov, setGov] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    listFactories({ data: { verified: verified || undefined, export_available: exportOnly || undefined, governorate: gov || undefined } })
      .then((r) => setRows(r.factories));
  }, [verified, exportOnly, gov]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1">
        <div className="rounded-[2rem] glass-card p-8 mb-8">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr] items-center">
            <div>
              <h1 className="text-4xl font-bold">{ar ? "دليل المصانع المصرية" : "Egypt Factory Directory"}</h1>
              <p className="text-muted-foreground mt-3 max-w-2xl">{ar ? "ابحث عن مصانع موثوقة بحسب القدرة الإنتاجية والمحافظة والتصدير" : "Find factories by capacity, governorate, export"}</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-3xl bg-surface p-4 text-center">
                <div className="text-2xl font-semibold">{rows.length}</div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{ar ? "المصانع" : "Factories"}</div>
              </div>
              <div className="rounded-3xl bg-surface p-4 text-center">
                <div className="text-2xl font-semibold">{verified ? "✓" : "⚡"}</div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{ar ? "التصفية الذكية" : "Smart filters"}</div>
              </div>
              <div className="rounded-3xl bg-surface p-4 text-center">
                <div className="text-2xl font-semibold">{exportOnly ? "✔" : "🌍"}</div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{ar ? "فرص التصدير" : "Export-ready"}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-[2rem] panel-card p-6 mb-8">
          <div className="flex flex-wrap gap-3 items-center">
            <input className="flex-1 min-w-[220px] h-12 rounded-3xl border border-input bg-background px-4 text-sm text-foreground" placeholder={ar ? "ابحث عن محافظة أو مدينة" : "Search governorate or city"} value={gov} onChange={(e) => setGov(e.target.value)} />
            <label className="flex items-center gap-2 rounded-3xl border border-white/10 bg-surface px-4 py-3 text-sm">
              <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />{ar ? "موثق فقط" : "Verified only"}
            </label>
            <label className="flex items-center gap-2 rounded-3xl border border-white/10 bg-surface px-4 py-3 text-sm">
              <input type="checkbox" checked={exportOnly} onChange={(e) => setExportOnly(e.target.checked)} />{ar ? "متاح للتصدير" : "Export available"}
            </label>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.length === 0 && <div className="col-span-full text-center text-muted-foreground py-10">{ar ? "لا توجد مصانع" : "No factories"}</div>}
          {rows.map((f) => (
            <Link key={f.company_id} to="/factories/$id" params={{ id: f.company_id }} className="rounded-[1.5rem] border border-border bg-surface-2 p-5 hover:bg-surface shadow-elev transition">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold">{ar ? f.companies?.name_ar : f.companies?.name_en}</div>
                {f.verified && <Badge variant="secondary">{ar ? "موثق" : "Verified"}</Badge>}
              </div>
              <div className="text-sm text-muted-foreground mt-2">{f.companies?.governorate || f.companies?.city || f.companies?.country}</div>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                {f.production_capacity && <div>{ar ? "الطاقة الإنتاجية:" : "Capacity:"} <span className="text-foreground">{f.production_capacity}</span></div>}
                {f.export_available && <Badge variant="secondary">{ar ? "متاح للتصدير" : "Export"}</Badge>}
              </div>
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
