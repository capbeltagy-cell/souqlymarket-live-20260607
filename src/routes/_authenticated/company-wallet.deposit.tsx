import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowUpCircle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/I18nProvider";
import { createCompanyDeposit } from "@/lib/company-wallet.functions";
import { listActivePaymentMethods } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/company-wallet/deposit")({
  head: () => ({ meta: [{ title: "شحن رصيد الشركة — Souqly" }] }),
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: DepositPage,
});

function DepositPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const nav = useNavigate();
  const fCreate = useServerFn(createCompanyDeposit);
  const fMethods = useServerFn(listActivePaymentMethods);
  const [methods, setMethods] = useState<any[]>([]);
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<string>("");
  const [reference, setReference] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fMethods().then((r) => setMethods(r.items ?? [])).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const n = Number(amount);
      if (!Number.isFinite(n) || n <= 0) throw new Error(ar ? "أدخل مبلغًا صحيحًا" : "Enter a valid amount");
      await fCreate({ data: {
        amount: n, currency: "EGP",
        method_code: method || null,
        reference: reference || null,
        proof_url: proofUrl || null,
      }});
      toast.success(ar ? "تم إرسال طلب الإيداع للمراجعة" : "Deposit submitted for review");
      nav({ to: "/company-wallet" });
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  const selected = methods.find((m) => m.code === method);

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1 max-w-2xl">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-4">
          <ArrowUpCircle className="h-6 w-6 text-primary" />
          {ar ? "شحن رصيد الشركة" : "Deposit funds"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {ar
            ? "يُستخدم هذا الرصيد لتفعيل حملات التسويق. يتم تجميد جزء منه كضمان عمولات المسوقين، ويُصرف عند اعتماد التحويلات."
            : "Balance is used to activate marketer campaigns. A portion is held as a reserve against commissions and released when campaigns end."}
        </p>

        <form onSubmit={submit} className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-card">
          <div>
            <Label>{ar ? "المبلغ (جنيه مصري)" : "Amount (EGP)"}</Label>
            <Input type="number" min={1} step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div>
            <Label>{ar ? "طريقة الدفع" : "Payment method"}</Label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">{ar ? "اختر طريقة الدفع" : "Select payment method"}</option>
              {methods.map((m) => (
                <option key={m.id} value={m.code}>{ar ? m.name_ar : (m.name_en ?? m.name_ar)}</option>
              ))}
            </select>
            {selected?.instructions_ar && (
              <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line">
                {ar ? selected.instructions_ar : (selected.instructions_en ?? selected.instructions_ar)}
              </p>
            )}
          </div>
          <div>
            <Label>{ar ? "رقم/مرجع الحوالة" : "Reference / transaction ID"}</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={200} />
          </div>
          <div>
            <Label>{ar ? "رابط إثبات التحويل (اختياري)" : "Proof URL (optional)"}</Label>
            <Input type="url" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} />
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={busy}>{busy ? (ar ? "جاري الإرسال..." : "Submitting...") : (ar ? "إرسال الطلب" : "Submit")}</Button>
          </div>
        </form>
      </div>
      <SiteFooter />
    </div>
  );
}
