import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { getMyRfqs } from "@/lib/phase3.functions";

export const Route = createFileRoute("/_authenticated/rfq/mine")({ component: MyRfqs });

function MyRfqs() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    getMyRfqs().then((r) => setRows(r.rfqs));
  }, []);
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">{ar ? "طلباتي" : "My RFQs"}</h1>
          <Button asChild className="bg-primary hover:bg-primary-hover">
            <Link to="/rfq/new">{ar ? "+ جديد" : "+ New"}</Link>
          </Button>
        </div>
        <div className="space-y-3">
          {rows.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              {ar ? "لا توجد طلبات" : "No RFQs"}
            </div>
          )}
          {rows.map((r) => (
            <Link
              key={r.id}
              to="/rfq/$id"
              params={{ id: r.id }}
              className="block rounded-lg border border-border bg-card p-5 hover:bg-muted shadow-card"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">{r.title}</div>
                <Badge>{r.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(r.created_at).toLocaleString(ar ? "ar-EG" : undefined)}
              </div>
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
