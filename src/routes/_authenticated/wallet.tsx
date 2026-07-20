import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Wallet, TrendingUp, Clock, ArrowDownToLine } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { useI18n } from "@/i18n/I18nProvider";
import { getMyWallets, listMyWalletTransactions } from "@/lib/wallets.functions";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "المحفظة — سوقلي" }] }),
  component: WalletPage,
});

function WalletPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fetchWallets = useServerFn(getMyWallets);
  const fetchTx = useServerFn(listMyWalletTransactions);
  const [wallets, setWallets] = useState<any[]>([]);
  const [txByWallet, setTxByWallet] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWallets();
        setWallets(res.wallets);
        const map: Record<string, any[]> = {};
        await Promise.all(
          res.wallets.map(async (w: any) => {
            const tx = await fetchTx({ data: { walletId: w.id } });
            map[w.id] = tx.transactions;
          }),
        );
        setTxByWallet(map);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Wallet className="h-6 w-6 text-primary" />
          {ar ? "محفظتي" : "My Wallet"}
        </h1>
        {loading ? (
          <p className="text-muted-foreground text-sm">{ar ? "جاري التحميل..." : "Loading..."}</p>
        ) : wallets.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            {ar
              ? "لا توجد محفظة بعد. ستُنشأ تلقائيًا عند أول معاملة."
              : "No wallet yet. It will be created automatically on your first transaction."}
          </div>
        ) : (
          <div className="space-y-6">
            {wallets.map((w) => (
              <div key={w.id} className="rounded-lg border border-border bg-card shadow-card">
                <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-2">
                  <div className="font-semibold capitalize">
                    {ar
                      ? w.kind === "agent"
                        ? "محفظة الوسيط"
                        : w.kind === "company"
                          ? "محفظة الشركة"
                          : "محفظة المنصة"
                      : `${w.kind} wallet`}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5">
                  <Stat
                    icon={Wallet}
                    label={ar ? "الرصيد المتاح" : "Available balance"}
                    value={formatPrice(Number(w.balance), locale, { showZero: true })}
                  />
                  <Stat
                    icon={Clock}
                    label={ar ? "رصيد معلق" : "Pending"}
                    value={formatPrice(Number(w.pending_balance), locale, { showZero: true })}
                  />
                  <Stat
                    icon={TrendingUp}
                    label={ar ? "إجمالي الأرباح" : "Total earned"}
                    value={formatPrice(Number(w.total_earned), locale, { showZero: true })}
                  />
                  <Stat
                    icon={ArrowDownToLine}
                    label={ar ? "المسحوب" : "Paid out"}
                    value={formatPrice(Number(w.total_paid_out), locale, { showZero: true })}
                  />
                </div>
                <div className="border-t border-border">
                  <div className="p-4 font-semibold text-sm">
                    {ar ? "آخر المعاملات" : "Recent transactions"}
                  </div>
                  <div className="divide-y divide-border">
                    {(txByWallet[w.id] ?? []).length === 0 && (
                      <div className="p-4 text-sm text-muted-foreground">
                        {ar ? "لا توجد معاملات" : "No transactions"}
                      </div>
                    )}
                    {(txByWallet[w.id] ?? []).slice(0, 20).map((t) => (
                      <div key={t.id} className="p-4 flex items-center justify-between text-sm">
                        <div>
                          <div className="font-medium">{t.notes || t.reason}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(t.created_at).toLocaleString()} · {t.reason}
                          </div>
                        </div>
                        <div
                          className={`font-bold ${Number(t.amount) >= 0 ? "text-success" : "text-destructive"}`}
                        >
                          {Number(t.amount) >= 0 ? "+" : ""}
                          {formatPrice(Number(t.amount), locale, { showZero: true })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-4">
      <Icon className="h-4 w-4 text-primary mb-2" />
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
