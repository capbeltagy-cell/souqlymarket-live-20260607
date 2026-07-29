import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, Clipboard, Clock3, CreditCard, Upload } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import {
  getManualPaymentCheckout,
  listMyManualPayments,
  submitManualPayment,
  type ManualPaymentRequest,
} from "@/lib/manual-payments.functions";

const searchSchema = z.object({ companyId: z.string().uuid().optional() });
const MAX_PROOF_SIZE = 5 * 1024 * 1024;
const PROOF_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const Route = createFileRoute("/_authenticated/manual-payment")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "الدفع اليدوي الآمن — سوقلي" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ManualPaymentPage,
});

type Checkout = Awaited<ReturnType<typeof getManualPaymentCheckout>>;
type MethodCode = Checkout["methods"][number]["code"];

function statusBadge(status: ManualPaymentRequest["status"], ar: boolean) {
  if (status === "approved")
    return (
      <Badge className="bg-success text-success-foreground">{ar ? "مقبول" : "Approved"}</Badge>
    );
  if (status === "rejected")
    return <Badge variant="destructive">{ar ? "مرفوض" : "Rejected"}</Badge>;
  return <Badge variant="secondary">{ar ? "قيد المراجعة" : "Pending review"}</Badge>;
}

function ManualPaymentPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { user } = useAuth();
  const { companyId } = Route.useSearch();
  const loadCheckout = useServerFn(getManualPaymentCheckout);
  const loadRequests = useServerFn(listMyManualPayments);
  const submit = useServerFn(submitManualPayment);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [requests, setRequests] = useState<ManualPaymentRequest[]>([]);
  const [selected, setSelected] = useState<MethodCode>("instapay");
  const [copied, setCopied] = useState(false);
  const [senderPhone, setSenderPhone] = useState("");
  const [reference, setReference] = useState("");
  const [transferredAt, setTransferredAt] = useState("");
  const [notes, setNotes] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [databaseUnavailable, setDatabaseUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      companyId ? loadCheckout({ data: { companyId } }) : Promise.resolve(null),
      loadRequests(),
    ])
      .then(([checkoutResult, requestResult]) => {
        if (!active) return;
        setCheckout(checkoutResult);
        setRequests(requestResult.items);
        setDatabaseUnavailable(requestResult.unavailable);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "تعذر تحميل صفحة الدفع");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [companyId, loadCheckout, loadRequests]);

  const method = useMemo(
    () => checkout?.methods.find((item) => item.code === selected) ?? null,
    [checkout, selected],
  );

  const copyNumber = async () => {
    if (!method) return;
    await navigator.clipboard.writeText(method.number);
    setCopied(true);
    toast.success(ar ? "تم النسخ" : "Copied");
    window.setTimeout(() => setCopied(false), 1800);
  };

  const onProofChange = (file: File | null) => {
    if (!file) {
      setProof(null);
      return;
    }
    if (!PROOF_TYPES.has(file.type)) {
      toast.error(ar ? "استخدم صورة JPG أو PNG أو WebP" : "Use a JPG, PNG or WebP image");
      return;
    }
    if (file.size > MAX_PROOF_SIZE) {
      toast.error(ar ? "حجم الصورة يجب ألا يتجاوز 5 ميجابايت" : "Image must be under 5 MB");
      return;
    }
    setProof(file);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!checkout || !method || !user) return;
    if (!/^\+?[0-9]{10,15}$/.test(senderPhone)) {
      toast.error(ar ? "أدخل رقم هاتف صحيحًا" : "Enter a valid phone number");
      return;
    }
    if (!transferredAt) {
      toast.error(ar ? "حدد وقت التحويل" : "Select transfer time");
      return;
    }
    if (!proof) {
      toast.error(ar ? "صورة التحويل مطلوبة" : "Transfer screenshot is required");
      return;
    }

    setSubmitting(true);
    let uploadedPath: string | null = null;
    try {
      const extension = proof.name.split(".").pop()?.toLowerCase() || "jpg";
      uploadedPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("manual-payment-proofs")
        .upload(uploadedPath, proof, {
          cacheControl: "3600",
          contentType: proof.type,
          upsert: false,
        });
      if (uploadError) throw new Error(uploadError.message);

      await submit({
        data: {
          companyId: checkout.companyId,
          notes: notes || null,
          paymentMethod: selected,
          proofPath: uploadedPath,
          senderPhone,
          transferReference: reference || null,
          transferredAt: new Date(transferredAt).toISOString(),
        },
      });
      toast.success(
        ar ? "تم إرسال الإثبات — بانتظار مراجعة الإدارة" : "Proof submitted for review",
      );
      setSenderPhone("");
      setReference("");
      setTransferredAt("");
      setNotes("");
      setProof(null);
      const refreshed = await loadRequests();
      setRequests(refreshed.items);
    } catch (cause) {
      if (uploadedPath) {
        await supabase.storage
          .from("manual-payment-proofs")
          .remove([uploadedPath])
          .catch(() => null);
      }
      toast.error(cause instanceof Error ? cause.message : "تعذر إرسال إثبات الدفع");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="container-souqly flex-1 py-8 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <Badge variant="secondary" className="mb-3">
              {ar ? "دفع يدوي آمن" : "Secure manual payment"}
            </Badge>
            <h1 className="text-2xl font-bold sm:text-4xl">
              {ar ? "تفعيل الباقة المميزة" : "Activate your premium plan"}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {ar
                ? "حوّل المبلغ، ثم ارفع صورة التحويل. لن تُفعّل الخدمة إلا بعد مراجعة الإدارة."
                : "Transfer the amount and upload the receipt. Activation only follows admin verification."}
            </p>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-64 animate-pulse rounded-2xl bg-muted" />
              <div className="h-64 animate-pulse rounded-2xl bg-muted" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTitle>{ar ? "تعذر فتح الدفع" : "Payment unavailable"}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : !companyId || !checkout ? (
            <Alert>
              <AlertTitle>{ar ? "اختر الشركة أولًا" : "Select your company first"}</AlertTitle>
              <AlertDescription className="mt-3">
                <Button asChild size="sm">
                  <Link to="/pricing">{ar ? "العودة إلى الباقات" : "Back to pricing"}</Link>
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {databaseUnavailable && (
                <Alert className="mb-6">
                  <AlertTitle>
                    {ar ? "تحديث قاعدة البيانات مطلوب" : "Database update required"}
                  </AlertTitle>
                  <AlertDescription>
                    {ar
                      ? "الواجهة جاهزة، وسيبدأ استقبال الطلبات بعد تطبيق Migration الدفع اليدوي على بيئة الاختبار."
                      : "The interface is ready. Submissions start after applying the manual-payment migration to Test."}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <section className="space-y-4">
                  <div className="rounded-2xl border bg-card p-5 shadow-card">
                    <p className="text-sm text-muted-foreground">{checkout.companyName}</p>
                    <div className="mt-2 flex items-end justify-between gap-4">
                      <span className="text-sm">{ar ? "المبلغ المطلوب" : "Amount due"}</span>
                      <strong className="text-2xl text-primary">
                        {checkout.amountEgp.toLocaleString(ar ? "ar-EG" : "en-US")}{" "}
                        {ar ? "جنيه" : "EGP"}
                      </strong>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    {checkout.methods.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setSelected(item.code)}
                        className={`rounded-2xl border-2 bg-card p-5 text-start transition ${
                          selected === item.code
                            ? "border-primary shadow-elev"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                              <CreditCard className="h-5 w-5" />
                            </span>
                            <div>
                              <strong>{ar ? item.nameAr : item.nameEn}</strong>
                              <p className="mt-1 font-mono text-sm" dir="ltr">
                                {item.number}
                              </p>
                            </div>
                          </div>
                          {selected === item.code && <Check className="h-5 w-5 text-primary" />}
                        </div>
                      </button>
                    ))}
                  </div>

                  {method && (
                    <div className="rounded-2xl border bg-muted/40 p-5">
                      <h2 className="font-semibold">{ar ? "خطوات التحويل" : "Transfer steps"}</h2>
                      <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                        <li>1. {ar ? `اختر ${method.nameAr}.` : `Choose ${method.nameEn}.`}</li>
                        <li>
                          2. {ar ? "حوّل المبلغ كاملًا إلى الرقم:" : "Transfer the full amount to:"}
                        </li>
                      </ol>
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border bg-background p-3">
                        <span className="font-mono font-bold" dir="ltr">
                          {method.number}
                        </span>
                        <Button type="button" variant="outline" size="sm" onClick={copyNumber}>
                          {copied ? (
                            <CheckCircle2 className="me-2 h-4 w-4" />
                          ) : (
                            <Clipboard className="me-2 h-4 w-4" />
                          )}
                          {copied ? (ar ? "تم النسخ" : "Copied") : ar ? "نسخ" : "Copy"}
                        </Button>
                      </div>
                    </div>
                  )}
                </section>

                <form
                  onSubmit={onSubmit}
                  className="space-y-5 rounded-2xl border bg-card p-5 shadow-card sm:p-7"
                >
                  <div>
                    <h2 className="text-xl font-bold">
                      {ar ? "رفع إثبات الدفع" : "Upload payment proof"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {ar ? "جميع الحقول بعلامة * مطلوبة." : "Fields marked * are required."}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sender-phone">
                      {ar ? "رقم الهاتف المحول منه *" : "Sender phone *"}
                    </Label>
                    <Input
                      id="sender-phone"
                      inputMode="tel"
                      dir="ltr"
                      required
                      value={senderPhone}
                      onChange={(event) =>
                        setSenderPhone(event.target.value.replace(/[^\d+]/g, ""))
                      }
                      placeholder="+201xxxxxxxxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference">
                      {ar ? "الرقم المرجعي (اختياري)" : "Reference (optional)"}
                    </Label>
                    <Input
                      id="reference"
                      maxLength={100}
                      value={reference}
                      onChange={(event) => setReference(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transferred-at">
                      {ar ? "وقت التحويل *" : "Transfer time *"}
                    </Label>
                    <div className="relative">
                      <Clock3 className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="transferred-at"
                        type="datetime-local"
                        required
                        className="ps-9"
                        value={transferredAt}
                        onChange={(event) => setTransferredAt(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proof">{ar ? "صورة التحويل *" : "Transfer screenshot *"}</Label>
                    <label
                      htmlFor="proof"
                      className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center hover:border-primary"
                    >
                      <Upload className="mb-2 h-6 w-6 text-primary" />
                      <span className="text-sm">
                        {proof?.name || (ar ? "اختر صورة حتى 5 MB" : "Choose an image up to 5 MB")}
                      </span>
                      <input
                        id="proof"
                        type="file"
                        className="sr-only"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => onProofChange(event.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">{ar ? "ملاحظات" : "Notes"}</Label>
                    <Textarea
                      id="notes"
                      maxLength={500}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </div>
                  <Button className="w-full" size="lg" disabled={submitting || databaseUnavailable}>
                    {submitting
                      ? ar
                        ? "جارٍ الإرسال…"
                        : "Submitting…"
                      : ar
                        ? "إرسال للمراجعة"
                        : "Submit for review"}
                  </Button>
                </form>
              </div>
            </>
          )}

          {requests.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-4 text-xl font-bold">
                {ar ? "طلبات الدفع السابقة" : "Previous requests"}
              </h2>
              <div className="space-y-3">
                {requests.map((request) => (
                  <article key={request.id} className="rounded-xl border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <strong>
                          {(request.amount_cents / 100).toLocaleString(ar ? "ar-EG" : "en-US")}{" "}
                          {request.currency}
                        </strong>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleString(ar ? "ar-EG" : "en-GB")}
                        </p>
                      </div>
                      {statusBadge(request.status, ar)}
                    </div>
                    {request.status === "rejected" && request.rejection_reason && (
                      <Alert variant="destructive" className="mt-3">
                        <AlertTitle>{ar ? "سبب الرفض" : "Rejection reason"}</AlertTitle>
                        <AlertDescription>{request.rejection_reason}</AlertDescription>
                      </Alert>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
