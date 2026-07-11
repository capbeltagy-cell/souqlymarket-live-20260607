import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Wallet, ArrowUpCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import {
  getMyCompanyFundingWallet,
  listMyCompanyDeposits,
  cancelMyCompanyDeposit,
} from "@/lib/company-wallet.functions";

export const Route = createFileRoute("/_authenticated/company-wallet")({
  head: () => ({ meta: [{ title: "محفظة الشركة — Souqly" }] }),
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: CompanyWalletPage,
});

function fmt(n: number | string | null | undefined) {
  return Number(n ?? 0).toLocaleString("en-EG", { maximumFractionDigits: 2 });
}

function CompanyWalletPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fGet = useServerFn(getMyCompanyFundingWallet);
  const fDeps = useServerFn(listMyCompanyDeposits);
  const fCancel = useServerFn(cancelMyCompanyDeposit);
  const [state, setState] = useState<any>(null);
  const [deps, setDeps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [w, d] = await Promise.all([fGet(), fDeps()]);
      setState(w); setDeps(d.deposits);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const wallet = state?.wallet;

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            {ar ? "محفظة الشركة" : "Company Wallet"}
          </h1>
          <Link to="/company-wallet/deposit"><Button><ArrowUpCircle className="h-4 w-4 me-2" />{ar ? "شحن الرصيد" : "Deposit funds"}</Button></Link>
        </div>

        {loading && <div className="text-sm text-muted-foreground">{ar ? "جاري التحميل..." : "Loading..."}</div>}

        {wallet && (
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label={ar ? "الرصيد المتاح" : "Available"} value={`${fmt(wallet.balance)} EGP`} accent="text-primary" />
            <StatCard label={ar ? "محجوز للحملات" : "Reserved for campaigns"} value={`${fmt(wallet.reserved_balance)} EGP`} accent="text-amber-600" />
            <StatCard label={ar ? "إجمالي الإنفاق" : "Total spent"} value={`${fmt(wallet.total_paid_out)} EGP`} accent="text-muted-foreground" />
          </div>
        )}

        <section className="rounded-lg border border-border bg-card p-5 shadow-card">
          <h2 className="font-semibold mb-3">{ar ? "طلبات الإيداع" : "Deposit requests"}</h2>
          {deps.length === 0 ? (
            <p className="text-sm text-muted-foreground">{ar ? "لا يوجد طلبات إيداع بعد." : "No deposits yet."}</p>
          ) : (
            <div className="divide-y divide-border">
              {deps.map((d) => (
                <div key={d.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm">
                    <div className="font-medium">{fmt(d.amount)} {d.currency}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleString()} · {d.method_code ?? (ar ? "غير محدد" : "n/a")}
                      {d.reference ? ` · ${d.reference}` : ""}
                    </div>
                    {d.admin_notes && <div className="text-xs text-muted-foreground mt-1">📝 {d.admin_notes}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={d.status} />
                    {["pending", "under_review"].includes(d.status) && (
                      <Button variant="outline" size="sm" onClick={async () => {
                        await fCancel({ data: { id: d.id } });
                        toast.success(ar ? "تم الإلغاء" : "Cancelled");
                        load();
                      }}>{ar ? "إلغاء" : "Cancel"}</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-card">
          <h2 className="font-semibold mb-3">{ar ? "آخر الحركات" : "Recent activity"}</h2>
          {(!state?.transactions?.length) ? (
            <p className="text-sm text-muted-foreground">{ar ? "لا توجد حركات." : "No transactions."}</p>
          ) : (
            <div className="divide-y divide-border text-sm">
              {state.transactions.map((t: any) => (
                <div key={t.id} className="py-2 flex justify-between gap-3">
                  <div>
                    <div className="font-medium">{t.reason}</div>
                    <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()} · {t.notes ?? ""}</div>
                  </div>
                  <div className={Number(t.amount) >= 0 ? "text-emerald-600 font-medium" : "text-destructive font-medium"}>
                    {Number(t.amount) >= 0 ? "+" : ""}{fmt(t.amount)} {t.currency}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${accent ?? ""}`}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { icon: any; cls: string; text: string }> = {
    pending: { icon: Clock, cls: "bg-amber-100 text-amber-700", text: "قيد المراجعة" },
    under_review: { icon: Clock, cls: "bg-amber-100 text-amber-700", text: "قيد المراجعة" },
    approved: { icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-700", text: "معتمد" },
    rejected: { icon: XCircle, cls: "bg-red-100 text-red-700", text: "مرفوض" },
    cancelled: { icon: XCircle, cls: "bg-muted text-muted-foreground", text: "ملغي" },
  };
  const it = map[status] ?? map.pending;
  const Icon = it.icon;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${it.cls}`}><Icon className="h-3 w-3" />{it.text}</span>;
}
