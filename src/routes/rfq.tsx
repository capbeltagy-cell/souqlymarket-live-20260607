import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nProvider";
import { listRfqs } from "@/lib/phase3.functions";
import { CollectionState } from "@/components/CollectionState";

export const Route = createFileRoute("/rfq")({
  head: () => ({
    meta: [
      { title: "طلبات عروض الأسعار — Souqly" },
      {
        name: "description",
        content: "استعرض طلبات عروض الأسعار الحقيقية من المشترين والشركات على سوقلي.",
      },
    ],
    links: [{ rel: "canonical", href: "https://souqlymarket.com/rfq" }],
  }),
  component: RfqList,
});

function RfqList() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  useEffect(() => {
    setLoading(true);
    setError(null);
    listRfqs({ data: {} })
      .then((r) => setRfqs(r.rfqs))
      .catch(() => setError(ar ? "تعذر تحميل طلبات عروض الأسعار." : "Unable to load RFQs."))
      .finally(() => setLoading(false));
  }, [ar, retryToken]);
  return (
    <PublicLayout>
      <section className="container-souqly flex-1 py-8 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">
              {ar ? "طلبات عروض الأسعار (RFQ)" : "Requests for Quotation"}
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              {ar
                ? "اطلب عروض أسعار من شركات متعددة وقارن بينها"
                : "Request quotes from multiple companies"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Button asChild className="bg-primary hover:bg-primary-hover">
              <Link to="/rfq/new">{ar ? "+ نشر طلب عرض سعر" : "+ New RFQ"}</Link>
            </Button>
            <div className="rounded-3xl bg-surface px-4 py-3 text-sm text-muted-foreground">
              {rfqs.length} {ar ? "طلب" : "requests"}
            </div>
          </div>
        </div>
        <CollectionState
          loading={loading}
          error={error}
          empty={rfqs.length === 0}
          emptyTitle={ar ? "لا توجد طلبات عروض أسعار حاليًا" : "No RFQs yet"}
          emptyDescription={
            ar
              ? "يمكنك نشر طلب جديد لاستقبال عروض الموردين."
              : "Create a request to receive supplier quotes."
          }
          retryLabel={ar ? "إعادة المحاولة" : "Try again"}
          onRetry={() => setRetryToken((value) => value + 1)}
        />
        {!loading && !error && rfqs.length > 0 && (
          <div className="grid gap-4">
            {rfqs.map((r) => (
              <Link
                key={r.id}
                to="/rfq/$id"
                params={{ id: r.id }}
                className="block rounded-2xl border border-border bg-surface-2 p-4 shadow-elev transition hover:bg-surface md:p-6"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-xl">{r.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {r.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-4 text-sm text-muted-foreground">
                      {r.category_slug && (
                        <span className="rounded-2xl bg-white/5 px-3 py-1">{r.category_slug}</span>
                      )}
                      {r.governorate && (
                        <span className="rounded-2xl bg-white/5 px-3 py-1">{r.governorate}</span>
                      )}
                      {r.quantity && (
                        <span>
                          {ar ? "الكمية:" : "Qty:"} {r.quantity} {r.unit ?? ""}
                        </span>
                      )}
                      {(r.budget_min || r.budget_max) && (
                        <span>
                          {ar ? "الميزانية:" : "Budget:"} {r.budget_min ?? "?"}–
                          {r.budget_max ?? "?"} {r.currency}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 items-start sm:items-end">
                    <Badge variant={r.status === "open" ? "default" : "secondary"}>
                      {r.status}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {ar ? "تاريخ النشر:" : "Posted:"}{" "}
                      {new Date(r.created_at ?? r.updated_at ?? Date.now()).toLocaleDateString(
                        locale,
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
