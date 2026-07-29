import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { z } from "zod";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { getMyOnlinePayment } from "@/lib/paymob.functions";
import { useI18n } from "@/i18n/I18nProvider";

const searchSchema = z.object({ reference: z.string().uuid().catch("") });

export const Route = createFileRoute("/payment-result")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "نتيجة الدفع — سوقلي" }] }),
  component: PaymentResultPage,
});

type Payment = {
  amount_cents: number;
  currency: string;
  failure_code: string | null;
  status: string;
};

function PaymentResultPage() {
  const { reference } = Route.useSearch();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const loadPayment = useServerFn(getMyOnlinePayment);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = async () => {
    if (!reference) {
      setError(true);
      setLoading(false);
      return;
    }
    try {
      const result = await loadPayment({ data: { reference } });
      setPayment(result.payment);
      setError(!result.payment);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // loadPayment is provided by useServerFn and remains stable for this route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPayment, reference]);

  const paid = payment?.status === "paid";
  const failed = ["failed", "cancelled", "expired"].includes(payment?.status || "");

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <main className="container-souqly flex-1 py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          {loading ? (
            <Clock3 className="mx-auto h-12 w-12 animate-pulse text-primary" />
          ) : paid ? (
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          ) : failed || error ? (
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
          ) : (
            <Clock3 className="mx-auto h-12 w-12 text-warning" />
          )}
          <h1 className="mt-4 text-2xl font-bold">
            {loading
              ? ar
                ? "جارٍ التحقق من الدفع"
                : "Verifying payment"
              : paid
                ? ar
                  ? "تم تأكيد الدفع"
                  : "Payment confirmed"
                : failed || error
                  ? ar
                    ? "لم يكتمل الدفع"
                    : "Payment was not completed"
                  : ar
                    ? "الدفع قيد التحقق"
                    : "Payment verification pending"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {paid
              ? ar
                ? "تم التفعيل من الخادم بعد وصول تأكيد الدفع الموقّع."
                : "Activation was completed server-side after the signed payment confirmation."
              : ar
                ? "هذه الصفحة لا تفعّل الاشتراك. يمكنك التحديث بعد لحظات حتى يصل تأكيد بوابة الدفع."
                : "This page never activates a subscription. Refresh shortly while the gateway confirmation arrives."}
          </p>
          {payment && (
            <div className="mt-4 text-sm font-semibold">
              {(payment.amount_cents / 100).toLocaleString(ar ? "ar-EG" : "en-GB")}{" "}
              {payment.currency}
            </div>
          )}
          <div className="mt-6 flex justify-center gap-2">
            {!paid && !failed && !error && (
              <Button onClick={() => void refresh()}>{ar ? "تحقق مرة أخرى" : "Check again"}</Button>
            )}
            <Button asChild variant="outline">
              <Link to="/dashboard">{ar ? "لوحة التحكم" : "Dashboard"}</Link>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
