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
        <h1 className="text-3xl font-bold mb-2">{ar ? "دليل المصانع المصرية" : "Egypt Factory Directory"}</h1>
        <p className="text-muted-foreground mb-6">{ar ? "ابحث عن مصانع موثوقة بحسب القدرة الإنتاجية والمحافظة والتصدير" : "Find factories by capacity, governorate, export"}</p>
        <div className="flex flex-wrap gap-3 mb-6">
          <input className="h-10 rounded-md border border-input bg-background px-3" placeholder={ar ? "المحافظة" : "Governorate"} value={gov} onChange={(e) => setGov(e.target.value)} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />{ar ? "موثق فقط" : "Verified only"}</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={exportOnly} onChange={(e) => setExportOnly(e.target.checked)} />{ar ? "متاح للتصدير" : "Export available"}</label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.length === 0 && <div className="col-span-full text-center text-muted-foreground py-10">{ar ? "لا توجد مصانع" : "No factories"}</div>}
          {rows.map((f) => (
            <Link key={f.company_id} to="/factories/$id" params={{ id: f.company_id }} className="rounded-lg border border-border bg-card p-5 hover:bg-muted shadow-card space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold">{ar ? f.companies?.name_ar : f.companies?.name_en}</div>
                {f.verified && <Badge>{ar ? "موثق" : "Verified"}</Badge>}
              </div>
              <div className="text-sm text-muted-foreground">{f.companies?.governorate || f.companies?.city || f.companies?.country}</div>
              {f.production_capacity && <div className="text-xs">{ar ? "الطاقة الإنتاجية:" : "Capacity:"} {f.production_capacity}</div>}
              {f.export_available && <Badge variant="secondary">{ar ? "متاح للتصدير" : "Export"}</Badge>}
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
