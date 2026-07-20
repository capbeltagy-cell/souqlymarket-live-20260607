import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Banknote, PlusCircle, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/currency";
import { getMyWallets } from "@/lib/wallets.functions";
import {
  listMyPayouts,
  listMyPayoutMethods,
  createPayoutMethod,
  deletePayoutMethod,
  requestWithdrawal,
  cancelWithdrawal,
  getPlatformSettings,
} from "@/lib/marketing.functions";

export const Route = createFileRoute("/_authenticated/payouts")({
  head: () => ({ meta: [{ title: "Withdrawals — Marketing Center" }] }),
  component: PayoutsPage,
});

type MethodKind = "vodafone_cash" | "instapay" | "bank" | "usdt_binance" | "usdt_bybit";

const KIND_LABELS: Record<MethodKind, { ar: string; en: string }> = {
  vodafone_cash: { ar: "فودافون كاش", en: "Vodafone Cash" },
  instapay: { ar: "إنستاباي", en: "InstaPay" },
  bank: { ar: "تحويل بنكي", en: "Bank Transfer" },
  usdt_binance: { ar: "Binance USDT", en: "Binance USDT" },
  usdt_bybit: { ar: "Bybit USDT", en: "Bybit USDT" },
};

type FieldSpec = { key: string; ar: string; en: string; placeholder?: string };
const KIND_FIELDS: Record<MethodKind, FieldSpec[]> = {
  vodafone_cash: [
    { key: "owner", ar: "اسم صاحب المحفظة", en: "Wallet owner name" },
    { key: "phone", ar: "رقم الهاتف", en: "Phone number", placeholder: "01xxxxxxxxx" },
  ],
  instapay: [
    { key: "address", ar: "عنوان إنستاباي", en: "InstaPay address" },
    { key: "owner", ar: "اسم صاحب الحساب", en: "Account owner name" },
  ],
  bank: [
    { key: "bank_name", ar: "اسم البنك", en: "Bank name" },
    { key: "owner", ar: "اسم صاحب الحساب", en: "Account holder name" },
    { key: "iban", ar: "رقم الحساب / IBAN", en: "Account number / IBAN" },
  ],
  usdt_binance: [
    { key: "wallet_address", ar: "عنوان المحفظة", en: "Wallet address" },
    { key: "network", ar: "الشبكة", en: "Network", placeholder: "TRC20 / BEP20" },
  ],
  usdt_bybit: [
    { key: "wallet_address", ar: "عنوان المحفظة", en: "Wallet address" },
    { key: "network", ar: "الشبكة", en: "Network", placeholder: "TRC20 / BEP20" },
  ],
};

function PayoutsPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fWallets = useServerFn(getMyWallets);
  const fMethods = useServerFn(listMyPayoutMethods);
  const fCreateMethod = useServerFn(createPayoutMethod);
  const fDeleteMethod = useServerFn(deletePayoutMethod);
  const fPayouts = useServerFn(listMyPayouts);
  const fRequest = useServerFn(requestWithdrawal);
  const fCancel = useServerFn(cancelWithdrawal);
  const fSettings = useServerFn(getPlatformSettings);

  const [wallet, setWallet] = useState<any>(null);
  const [methods, setMethods] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState("");
  const [notes, setNotes] = useState("");
  const [mKind, setMKind] = useState<MethodKind>("vodafone_cash");
  const [mLabel, setMLabel] = useState("");
  const [mDetails, setMDetails] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = () => {
    fWallets().then((r) =>
      setWallet(r.wallets.find((w: any) => w.kind === "agent") ?? r.wallets[0] ?? null),
    );
    fMethods().then((r) => setMethods(r.methods));
    fPayouts().then((r) => setPayouts(r.payouts));
    fSettings()
      .then((r) => setSettings(r.settings))
      .catch(() => {});
  };
  useEffect(() => {
    load();
  }, []);

  const minWithdrawal = Number(settings?.min_withdrawal_amount ?? 100);
  const totalPending = useMemo(
    () =>
      payouts
        .filter((p) => p.status === "pending" || p.status === "approved")
        .reduce((s, p) => s + Number(p.amount), 0),
    [payouts],
  );
  const totalWithdrawn = useMemo(
    () => payouts.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0),
    [payouts],
  );

  const currentFields = KIND_FIELDS[mKind];

  const onAddMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const missing = currentFields.filter((f) => !mDetails[f.key]?.trim());
      if (missing.length) throw new Error(ar ? "أكمل كل الحقول" : "Fill all fields");
      // marketing.functions.ts createPayoutMethod validates kind — extend by casting; new kinds get stored as text.
      await fCreateMethod({
        data: {
          kind: mKind as any,
          label: mLabel || KIND_LABELS[mKind][ar ? "ar" : "en"],
          details: mDetails,
          isDefault: methods.length === 0,
        },
      });
      toast.success(ar ? "تم إضافة الطريقة" : "Method added");
      setMLabel("");
      setMDetails({});
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await fRequest({
        data: {
          amount: Number(amount),
          walletKind: "agent",
          payoutMethodId: methodId || null,
          notes: notes || null,
        },
      });
      toast.success(ar ? "تم إرسال طلب السحب" : "Withdrawal requested");
      setAmount("");
      setNotes("");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1 space-y-6">
        <div className="flex items-center gap-2">
          <Banknote className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">
            {ar ? "المحفظة والسحوبات" : "Wallet & Withdrawals"}
          </h1>
        </div>

        {/* Wallet stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={Wallet}
            label={ar ? "الرصيد المتاح" : "Available"}
            value={formatPrice(Number(wallet?.balance ?? 0), locale, { showZero: true })}
          />
          <StatCard
            label={ar ? "معلق" : "Pending"}
            value={formatPrice(Number(wallet?.pending_balance ?? 0), locale, { showZero: true })}
          />
          <StatCard
            label={ar ? "إجمالي الأرباح" : "Total earned"}
            value={formatPrice(Number(wallet?.total_earned ?? 0), locale, { showZero: true })}
          />
          <StatCard
            label={ar ? "إجمالي السحوبات" : "Total withdrawn"}
            value={formatPrice(totalWithdrawn, locale, { showZero: true })}
          />
        </div>
        {totalPending > 0 && (
          <div className="text-xs text-muted-foreground">
            {ar ? "قيد الصرف" : "In review"}:{" "}
            {formatPrice(totalPending, locale, { showZero: true })}
          </div>
        )}

        {/* Payout methods */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <div className="font-semibold mb-3">{ar ? "طرق السحب" : "Payout methods"}</div>
          <form onSubmit={onAddMethod} className="space-y-3 mb-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>{ar ? "نوع الطريقة" : "Method type"}</Label>
                <select
                  value={mKind}
                  onChange={(e) => {
                    setMKind(e.target.value as MethodKind);
                    setMDetails({});
                  }}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {(Object.keys(KIND_LABELS) as MethodKind[]).map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABELS[k][ar ? "ar" : "en"]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>{ar ? "اسم مختصر (اختياري)" : "Label (optional)"}</Label>
                <Input
                  value={mLabel}
                  onChange={(e) => setMLabel(e.target.value)}
                  placeholder={KIND_LABELS[mKind][ar ? "ar" : "en"]}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {currentFields.map((f) => (
                <div key={f.key}>
                  <Label>{ar ? f.ar : f.en}</Label>
                  <Input
                    value={mDetails[f.key] ?? ""}
                    onChange={(e) => setMDetails({ ...mDetails, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    required
                  />
                </div>
              ))}
            </div>
            <Button type="submit" disabled={busy}>
              <PlusCircle className="h-4 w-4 mr-1" />
              {ar ? "إضافة طريقة" : "Add method"}
            </Button>
          </form>
          <div className="divide-y divide-border">
            {methods.length === 0 && (
              <div className="text-sm text-muted-foreground py-2">
                {ar ? "لا توجد طرق سحب" : "No payout methods yet"}
              </div>
            )}
            {methods.map((m) => {
              const kind = m.kind as MethodKind;
              const label = KIND_LABELS[kind]?.[ar ? "ar" : "en"] ?? m.kind;
              const detailStr = Object.entries(m.details ?? {})
                .map(([k, v]) => `${k}: ${v}`)
                .join(" · ");
              return (
                <div key={m.id} className="py-2 flex items-center justify-between text-sm gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {m.label || label}{" "}
                      <span className="text-xs text-muted-foreground">· {label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{detailStr}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await fDeleteMethod({ data: { id: m.id } });
                      load();
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Request withdrawal */}
        <form
          onSubmit={onRequest}
          className="rounded-lg border border-border bg-card p-5 shadow-card space-y-3"
        >
          <div className="font-semibold">{ar ? "طلب سحب جديد" : "Request withdrawal"}</div>
          <div className="text-xs text-muted-foreground">
            {ar ? `الحد الأدنى للسحب` : `Minimum withdrawal`}:{" "}
            {formatPrice(minWithdrawal, locale, { showZero: true })}
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>{ar ? "المبلغ" : "Amount"}</Label>
              <Input
                type="number"
                min={minWithdrawal}
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>{ar ? "طريقة السحب" : "Payout method"}</Label>
              <select
                value={methodId}
                onChange={(e) => setMethodId(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">{ar ? "اختر طريقة" : "Select method"}</option>
                {methods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label || KIND_LABELS[m.kind as MethodKind]?.[ar ? "ar" : "en"] || m.kind}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>{ar ? "ملاحظات" : "Notes"}</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <Button
            type="submit"
            disabled={busy || !amount || !methodId}
            className="bg-primary hover:bg-primary-hover"
          >
            {ar ? "إرسال الطلب" : "Submit request"}
          </Button>
        </form>

        {/* History */}
        <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
          <div className="p-4 border-b border-border font-semibold">
            {ar ? "سجل السحوبات" : "Withdrawal history"}
          </div>
          {payouts.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {ar ? "لا توجد طلبات" : "No requests yet"}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {payouts.map((p) => (
                <div
                  key={p.id}
                  className="p-4 flex flex-wrap items-center justify-between gap-3 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {formatPrice(Number(p.amount), locale, { showZero: true })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString()} · {p.payout_methods?.label ?? "—"}
                    </div>
                    {p.admin_notes && (
                      <div className="text-xs text-muted-foreground mt-1">{p.admin_notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <PayoutBadge status={p.status} />
                    {p.status === "pending" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await fCancel({ data: { id: p.id } });
                          load();
                        }}
                      >
                        {ar ? "إلغاء" : "Cancel"}
                      </Button>
                    )}
                  </div>
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

function StatCard({ icon: Icon, label, value }: { icon?: any; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-card">
      {Icon ? <Icon className="h-4 w-4 text-primary mb-2" /> : null}
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function PayoutBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-warning/15 text-warning",
    approved: "bg-primary/10 text-primary",
    paid: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${map[status] ?? ""}`}>
      {status}
    </span>
  );
}
