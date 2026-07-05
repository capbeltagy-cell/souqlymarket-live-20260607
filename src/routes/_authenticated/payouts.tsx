import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  listMyPayouts, listMyPayoutMethods, createPayoutMethod, deletePayoutMethod,
  requestWithdrawal, cancelWithdrawal,
} from "@/lib/marketing.functions";

export const Route = createFileRoute("/_authenticated/payouts")({
  head: () => ({ meta: [{ title: "Withdrawals — Marketing Center" }] }),
  component: PayoutsPage,
});

const KINDS = [
  { v: "bank", ar: "حساب بنكي", en: "Bank account" },
  { v: "vodafone_cash", ar: "فودافون كاش", en: "Vodafone Cash" },
  { v: "instapay", ar: "إنستاباي", en: "InstaPay" },
  { v: "orange_money", ar: "أورنج كاش", en: "Orange Money" },
  { v: "etisalat_cash", ar: "اتصالات كاش", en: "Etisalat Cash" },
  { v: "wallet", ar: "محفظة أخرى", en: "Other wallet" },
];

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

  const [wallet, setWallet] = useState<any>(null);
  const [methods, setMethods] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState("");
  const [notes, setNotes] = useState("");
  const [mKind, setMKind] = useState("vodafone_cash");
  const [mLabel, setMLabel] = useState("");
  const [mAccount, setMAccount] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    fWallets().then((r) => setWallet(r.wallets.find((w: any) => w.kind === "agent") ?? r.wallets[0] ?? null));
    fMethods().then((r) => setMethods(r.methods));
    fPayouts().then((r) => setPayouts(r.payouts));
  };
  useEffect(() => { load(); }, []);

  const onAddMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await fCreateMethod({ data: { kind: mKind as any, label: mLabel, details: { account: mAccount }, isDefault: methods.length === 0 } });
      toast.success(ar ? "تم إضافة الطريقة" : "Method added");
      setMLabel(""); setMAccount("");
      load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const onRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await fRequest({ data: { amount: Number(amount), walletKind: "agent", payoutMethodId: methodId || null, notes: notes || null } });
      toast.success(ar ? "تم إرسال طلب السحب" : "Withdrawal requested");
      setAmount(""); setNotes("");
      load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1 space-y-6">
        <div className="flex items-center gap-2"><Banknote className="h-6 w-6 text-primary" /><h1 className="text-2xl font-bold">{ar ? "السحوبات" : "Withdrawals"}</h1></div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4"><Wallet className="h-5 w-5 text-primary" /><div className="font-semibold">{ar ? "الرصيد المتاح" : "Available balance"}</div></div>
          <div className="text-3xl font-bold">{formatPrice(Number(wallet?.balance ?? 0), locale, { showZero: true })}</div>
          <div className="text-xs text-muted-foreground mt-1">{ar ? "معلق" : "Pending"}: {formatPrice(Number(wallet?.pending_balance ?? 0), locale, { showZero: true })}</div>
        </div>

        {/* Payout methods */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <div className="font-semibold mb-3">{ar ? "طرق السحب" : "Payout methods"}</div>
          <form onSubmit={onAddMethod} className="grid md:grid-cols-4 gap-3 mb-4 items-end">
            <div><Label>{ar ? "النوع" : "Type"}</Label>
              <select value={mKind} onChange={(e) => setMKind(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                {KINDS.map((k) => <option key={k.v} value={k.v}>{ar ? k.ar : k.en}</option>)}
              </select>
            </div>
            <div><Label>{ar ? "اسم مختصر" : "Label"}</Label><Input value={mLabel} onChange={(e) => setMLabel(e.target.value)} required /></div>
            <div><Label>{ar ? "الحساب/الرقم" : "Account / Number"}</Label><Input value={mAccount} onChange={(e) => setMAccount(e.target.value)} required /></div>
            <Button type="submit" disabled={busy}><PlusCircle className="h-4 w-4 mr-1" />{ar ? "إضافة" : "Add"}</Button>
          </form>
          <div className="divide-y divide-border">
            {methods.length === 0 && <div className="text-sm text-muted-foreground py-2">{ar ? "لا توجد طرق سحب" : "No payout methods yet"}</div>}
            {methods.map((m) => (
              <div key={m.id} className="py-2 flex items-center justify-between text-sm">
                <div><span className="font-medium">{m.label}</span> <span className="text-xs text-muted-foreground">· {m.kind} · {m.details?.account ?? ""}</span></div>
                <Button size="sm" variant="ghost" onClick={async () => { await fDeleteMethod({ data: { id: m.id } }); load(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </div>

        {/* Request withdrawal */}
        <form onSubmit={onRequest} className="rounded-lg border border-border bg-card p-5 shadow-card space-y-3">
          <div className="font-semibold">{ar ? "طلب سحب جديد" : "Request withdrawal"}</div>
          <div className="grid md:grid-cols-3 gap-3">
            <div><Label>{ar ? "المبلغ" : "Amount"}</Label><Input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
            <div><Label>{ar ? "طريقة السحب" : "Payout method"}</Label>
              <select value={methodId} onChange={(e) => setMethodId(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">—</option>
                {methods.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div><Label>{ar ? "ملاحظات" : "Notes"}</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
          <Button type="submit" disabled={busy || !amount} className="bg-primary hover:bg-primary-hover">{ar ? "إرسال الطلب" : "Submit request"}</Button>
        </form>

        {/* History */}
        <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
          <div className="p-4 border-b border-border font-semibold">{ar ? "سجل السحوبات" : "Withdrawal history"}</div>
          {payouts.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">{ar ? "لا توجد طلبات" : "No requests yet"}</div> :
           <div className="divide-y divide-border">
             {payouts.map((p) => (
               <div key={p.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                 <div>
                   <div className="font-medium">{formatPrice(Number(p.amount), locale, { showZero: true })}</div>
                   <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()} · {p.payout_methods?.label ?? "—"}</div>
                   {p.admin_notes && <div className="text-xs text-muted-foreground mt-1">{p.admin_notes}</div>}
                 </div>
                 <div className="flex items-center gap-3">
                   <PayoutBadge status={p.status} />
                   {p.status === "pending" && (
                     <Button size="sm" variant="ghost" onClick={async () => { await fCancel({ data: { id: p.id } }); load(); }}>{ar ? "إلغاء" : "Cancel"}</Button>
                   )}
                 </div>
               </div>
             ))}
           </div>
          }
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function PayoutBadge({ status }: { status: string }) {
  const map: Record<string,string> = {
    pending: "bg-warning/15 text-warning",
    approved: "bg-primary/10 text-primary",
    paid: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${map[status] ?? ""}`}>{status}</span>;
}
