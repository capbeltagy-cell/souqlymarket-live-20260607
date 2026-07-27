import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AlertTriangle, FileText } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { useI18n } from "@/i18n/I18nProvider";
import { listMyInvoices } from "@/lib/wallets.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({ meta: [{ title: "الفواتير — سوقلي" }] }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fetchList = useServerFn(listMyInvoices);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const r = await fetchList();
        setRows(r.invoices);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "تعذر تحميل الفواتير");
      } finally {
        setLoading(false);
      }
    })();
  }, [retryKey]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <FileText className="h-6 w-6 text-primary" />
          {ar ? "الفواتير" : "Invoices"}
        </h1>
        <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-muted-foreground">
              {ar ? "جاري التحميل..." : "Loading..."}
            </div>
          ) : loadError ? (
            <div className="p-10 text-center text-muted-foreground">
              <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-destructive" />
              <p>{ar ? "تعذر تحميل الفواتير" : "Could not load invoices"}</p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => setRetryKey((key) => key + 1)}
              >
                {ar ? "إعادة المحاولة" : "Retry"}
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              {ar ? "لا توجد فواتير حتى الآن" : "No invoices yet"}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((r) => (
                <div key={r.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="font-mono text-sm">{r.invoice_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.purpose} · {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="font-bold">{formatPrice(Number(r.amount), locale)}</div>
                  <Badge variant={r.status === "paid" ? "default" : "outline"}>{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
