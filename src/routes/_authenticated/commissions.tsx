import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DollarSign, CheckCircle2, Clock, XCircle, Download, Send } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import { listMyCommissions, updateCommissionStatus, requestPayout } from "@/lib/commissions.functions";

export const Route = createFileRoute("/_authenticated/commissions")({
  head: () => ({ meta: [{ title: "Commissions — Souqly" }] }),
  component: CommissionsPage,
});

type Row = {
  id: string; amount: number; currency: string; status: string; created_at: string;
  payout_requested_at?: string | null; paid_at?: string | null;
  listings: { title_en: string | null; title_ar: string | null } | null;
  companies: { name_en: string | null; name_ar: string | null } | null;
};

function downloadCsv(rows: Row[], locale: string) {
  const header = ["Date", "Listing", "Company", "Amount", "Currency", "Status", "PayoutRequestedAt", "PaidAt"];
  const lines = rows.map((r) => [
    new Date(r.created_at).toISOString(),
    (locale === "ar" ? r.listings?.title_ar : r.listings?.title_en) ?? "",
    (locale === "ar" ? r.companies?.name_ar : r.companies?.name_en) ?? "",
    String(r.amount),
    r.currency,
    r.status,
    r.payout_requested_at ?? "",
    r.paid_at ?? "",
  ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `commissions-${Date.now()}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function CommissionsPage() {
  const { t, locale } = useI18n();
  const fetchList = useServerFn(listMyCommissions);
  const updateStatus = useServerFn(updateCommissionStatus);
  const reqPayout = useServerFn(requestPayout);
  const [rows, setRows] = useState<Row[]>([]);
  const [role, setRole] = useState<string>("none");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchList();
      setRole(res.role);
      setRows(res.commissions as unknown as Row[]);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const onSetStatus = async (id: string, status: "approved" | "paid" | "pending") => {
    try { await updateStatus({ data: { id, status } }); toast.success(t("status_updated")); load(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const onRequestPayout = async (id: string) => {
    try { await reqPayout({ data: { id } }); toast.success(t("payout_requested") || "Payout requested"); load(); }
    catch (e) { toast.error((e as Error).message); }
  };

  const totals = rows.reduce((acc, r) => {
    acc.total += Number(r.amount);
    if (r.status === "paid") acc.paid += Number(r.amount);
    if (r.status === "pending") acc.pending += Number(r.amount);
    return acc;
  }, { total: 0, paid: 0, pending: 0 });

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            {t("commissions_title")}
          </h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{role}</Badge>
            <Button size="sm" variant="outline" className="gap-2" disabled={rows.length === 0} onClick={() => downloadCsv(rows, locale)}>
              <Download className="h-4 w-4" />{t("export_csv")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <KPI label={t("total_earnings")} value={`$${totals.total.toLocaleString()}`} icon={DollarSign} />
          <KPI label={t("commissions_paid")} value={`$${totals.paid.toLocaleString()}`} icon={CheckCircle2} />
          <KPI label={t("commissions_pending")} value={`$${totals.pending.toLocaleString()}`} icon={Clock} />
        </div>

        <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
          <div className="p-4 border-b border-border font-semibold">{t("commissions_history")}</div>
          {loading ? (
            <div className="p-10 text-center text-muted-foreground text-sm">{t("loading")}</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">{t("empty_commissions")}</div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((r) => (
                <div key={r.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {(locale === "ar" ? r.listings?.title_ar : r.listings?.title_en) ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(locale === "ar" ? r.companies?.name_ar : r.companies?.name_en) ?? "—"} · {new Date(r.created_at).toLocaleDateString()}
                      {r.payout_requested_at && <> · 📨 {new Date(r.payout_requested_at).toLocaleDateString()}</>}
                      {r.paid_at && <> · ✅ {new Date(r.paid_at).toLocaleDateString()}</>}
                    </div>
                  </div>
                  <div className="font-bold text-success">${Number(r.amount).toLocaleString()} {r.currency}</div>
                  <StatusBadge status={r.status} />
                  {role === "agent" && r.status === "approved" && !r.payout_requested_at && (
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => onRequestPayout(r.id)}>
                      <Send className="h-4 w-4" />{t("request_payout")}
                    </Button>
                  )}
                  {role === "company" && r.status !== "paid" && (
                    <div className="flex gap-2">
                      {r.status !== "approved" && <Button size="sm" variant="outline" onClick={() => onSetStatus(r.id, "approved")}>{t("approve")}</Button>}
                      <Button size="sm" className="bg-primary hover:bg-primary-hover" onClick={() => onSetStatus(r.id, "paid")}>{t("mark_paid")}</Button>
                    </div>
                  )}
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

function KPI({ label, value, icon: Icon }: { label: string; value: string; icon: typeof DollarSign }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card">
      <Icon className="h-5 w-5 text-primary mb-2" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const v = status === "paid" ? { c: "bg-success/10 text-success", I: CheckCircle2 }
        : status === "approved" ? { c: "bg-primary/10 text-primary", I: CheckCircle2 }
        : status === "pending" ? { c: "bg-muted text-muted-foreground", I: Clock }
        : { c: "bg-destructive/10 text-destructive", I: XCircle };
  const Icon = v.I;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${v.c}`}><Icon className="h-3 w-3" />{status}</span>;
}
