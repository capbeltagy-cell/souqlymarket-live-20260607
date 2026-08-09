import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nProvider";
import { listFactories } from "@/lib/phase3.functions";
import { CollectionState } from "@/components/CollectionState";

export const Route = createFileRoute("/factories")({
  head: () => ({
    meta: [
      { title: "دليل المصانع المصرية — Souqly" },
      { name: "description", content: "دليل شامل للمصانع في مصر" },
    ],
  }),
  component: FactoriesList,
});

function FactoriesList() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [verified, setVerified] = useState(false);
  const [exportOnly, setExportOnly] = useState(false);
  const [gov, setGov] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  useEffect(() => {
    setLoading(true);
    setError(null);
    listFactories({
      data: {
        verified: verified || undefined,
        export_available: exportOnly || undefined,
        governorate: gov || undefined,
      },
    })
      .then((r) => setRows(r.factories))
      .catch(() => setError(ar ? "تعذر تحميل دليل المصانع." : "Unable to load factories."))
      .finally(() => setLoading(false));
  }, [ar, verified, exportOnly, gov, retryToken]);

  return (
    <PublicLayout>
      <section className="container-souqly flex-1 py-8 md:py-10">
        <div className="glass-card mb-6 rounded-xl p-5 md:p-7">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr] items-center">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">
                {ar ? "دليل المصانع المصرية" : "Egypt Factory Directory"}
              </h1>
              <p className="text-muted-foreground mt-3 max-w-2xl">
                {ar
                  ? "ابحث عن مصانع موثوقة بحسب القدرة الإنتاجية والمحافظة والتصدير"
                  : "Find factories by capacity, governorate, export"}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-xl border border-border bg-card p-4 text-center shadow-card">
                <div className="text-2xl font-semibold">{rows.length}</div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {ar ? "المصانع" : "Factories"}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 text-center shadow-card">
                <div className="text-2xl font-semibold">{verified ? "✓" : "⚡"}</div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {ar ? "التصفية الذكية" : "Smart filters"}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 text-center shadow-card">
                <div className="text-2xl font-semibold">{exportOnly ? "✔" : "🌍"}</div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {ar ? "فرص التصدير" : "Export-ready"}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="panel-card mb-6 rounded-xl p-4 md:p-5">
          <div className="flex flex-wrap gap-3 items-center">
            <input
              className="h-11 min-w-[220px] flex-1 rounded-lg border border-input bg-background px-4 text-sm text-foreground"
              placeholder={ar ? "ابحث عن محافظة أو مدينة" : "Search governorate or city"}
              value={gov}
              onChange={(e) => setGov(e.target.value)}
            />
            <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
              />
              {ar ? "موثق فقط" : "Verified only"}
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={exportOnly}
                onChange={(e) => setExportOnly(e.target.checked)}
              />
              {ar ? "متاح للتصدير" : "Export available"}
            </label>
          </div>
        </div>
        <CollectionState
          loading={loading}
          error={error}
          empty={rows.length === 0}
          emptyTitle={ar ? "لا توجد مصانع مطابقة" : "No matching factories"}
          emptyDescription={
            ar
              ? "غيّر المحافظة أو ألغِ بعض عوامل التصفية."
              : "Change the governorate or clear a filter."
          }
          retryLabel={ar ? "إعادة المحاولة" : "Try again"}
          onRetry={() => setRetryToken((value) => value + 1)}
        />
        {!loading && !error && rows.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((f) => (
              <Link
                key={f.company_id}
                to="/factories/$id"
                params={{ id: f.company_id }}
                className="rounded-xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-elev"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold">
                    {ar ? f.companies?.name_ar : f.companies?.name_en}
                  </div>
                  {f.verified && <Badge variant="secondary">{ar ? "موثق" : "Verified"}</Badge>}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {f.companies?.governorate || f.companies?.city || f.companies?.country}
                </div>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {f.production_capacity && (
                    <div>
                      {ar ? "الطاقة الإنتاجية:" : "Capacity:"}{" "}
                      <span className="text-foreground">{f.production_capacity}</span>
                    </div>
                  )}
                  {f.export_available && (
                    <Badge variant="secondary">{ar ? "متاح للتصدير" : "Export"}</Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
