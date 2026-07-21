import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Save, CheckCircle2, XCircle, CreditCard } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  listAllPaymentMethods,
  upsertPaymentMethod,
  listPendingProofs,
  reviewPaymentProof,
} from "@/lib/payments.functions";
import { requireAdminRoute } from "@/lib/route-guards";

type PaymentMethod = Awaited<ReturnType<typeof listAllPaymentMethods>>["items"][number];
type PendingProof = Awaited<ReturnType<typeof listPendingProofs>>["items"][number];

export const Route = createFileRoute("/_authenticated/admin-payments")({
  beforeLoad: requireAdminRoute,
  head: () => ({ meta: [{ title: "إدارة المدفوعات — سوقلي" }] }),
  component: AdminPayments,
});

function AdminPayments() {
  const loadMethods = useServerFn(listAllPaymentMethods);
  const save = useServerFn(upsertPaymentMethod);
  const loadPending = useServerFn(listPendingProofs);
  const review = useServerFn(reviewPaymentProof);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [pending, setPending] = useState<PendingProof[]>([]);
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [methodResult, proofResult] = await Promise.all([loadMethods(), loadPending()]);
      setMethods(methodResult.items);
      setPending(proofResult.items);
    } catch (e) {
      const message = e instanceof Error ? e.message : "تعذر تحميل بيانات المدفوعات";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const update = (id: string, patch: Partial<PaymentMethod>) => {
    setMethods((current) =>
      current.map((method) => (method.id === id ? { ...method, ...patch } : method)),
    );
  };

  const saveMethod = async (method: PaymentMethod) => {
    setBusy(`method:${method.id}`);
    try {
      const details =
        typeof method.account_details === "string"
          ? JSON.parse(method.account_details || "{}")
          : method.account_details || {};
      await save({
        data: {
          id: method.id,
          code: method.code,
          name_ar: method.name_ar,
          name_en: method.name_en,
          instructions_ar: method.instructions_ar,
          instructions_en: method.instructions_en,
          account_details: details,
          icon: method.icon,
          is_active: Boolean(method.is_active),
          sort_order: Number(method.sort_order || 0),
        },
      });
      toast.success("تم حفظ طريقة الدفع بنجاح");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر حفظ طريقة الدفع");
    } finally {
      setBusy(null);
    }
  };

  const doReview = async (id: string, action: "approve" | "reject") => {
    setBusy(`proof:${id}:${action}`);
    try {
      await review({ data: { id, action, review_note: reviewNote[id] || null } });
      toast.success(action === "approve" ? "تم اعتماد إثبات الدفع" : "تم رفض إثبات الدفع");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر مراجعة إثبات الدفع");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminLayout
      title="إدارة المدفوعات"
      breadcrumbs={[{ label: "المدفوعات" }]}
      loading={loading}
      error={error}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CreditCard className="h-5 w-5 text-primary" />
          <span>إدارة طرق الدفع ومراجعة إثباتات الدفع المعلقة.</span>
        </div>

        {!loading && (
          <Tabs defaultValue="methods">
            <TabsList>
              <TabsTrigger value="methods">طرق الدفع</TabsTrigger>
              <TabsTrigger value="review">إثباتات بانتظار المراجعة ({pending.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="methods" className="mt-4 space-y-4">
              {methods.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
                  لا توجد طرق دفع مسجلة
                </div>
              ) : (
                methods.map((method) => (
                  <div
                    key={method.id}
                    className="grid gap-3 rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="font-semibold">
                        {method.icon} {method.name_ar}{" "}
                        <span className="text-xs text-muted-foreground">({method.code})</span>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(method.is_active)}
                          onChange={(event) =>
                            update(method.id, { is_active: event.target.checked })
                          }
                        />
                        نشطة
                      </label>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <Input
                        placeholder="الاسم بالعربية"
                        value={method.name_ar || ""}
                        onChange={(event) => update(method.id, { name_ar: event.target.value })}
                      />
                      <Input
                        placeholder="الاسم بالإنجليزية"
                        value={method.name_en || ""}
                        onChange={(event) => update(method.id, { name_en: event.target.value })}
                      />
                    </div>
                    <Textarea
                      placeholder="تعليمات الدفع بالعربية"
                      value={method.instructions_ar || ""}
                      onChange={(event) =>
                        update(method.id, { instructions_ar: event.target.value })
                      }
                    />
                    <Textarea
                      placeholder='بيانات الحساب بصيغة JSON، مثال: {"رقم الهاتف":"01000000000"}'
                      value={
                        typeof method.account_details === "string"
                          ? method.account_details
                          : JSON.stringify(method.account_details || {}, null, 2)
                      }
                      onChange={(event) =>
                        update(method.id, { account_details: event.target.value })
                      }
                      className="font-mono text-xs"
                      rows={4}
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={() => void saveMethod(method)}
                        size="sm"
                        disabled={busy === `method:${method.id}`}
                      >
                        <Save className="me-1 h-4 w-4" />
                        حفظ
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="review" className="mt-4 space-y-3">
              {pending.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
                  لا توجد إثباتات بانتظار المراجعة
                </div>
              ) : (
                pending.map((proof) => (
                  <div key={proof.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">
                          {Number(proof.amount).toLocaleString("ar-EG")} {proof.currency} —{" "}
                          {proof.payment_method_code}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          طلب:{" "}
                          <Link
                            to="/orders/$id"
                            params={{ id: proof.order_id }}
                            className="text-primary"
                          >
                            #{proof.order_id.slice(0, 8)}
                          </Link>{" "}
                          • {new Date(proof.created_at).toLocaleString("ar-EG")}
                        </div>
                        {proof.reference && (
                          <div className="text-xs">
                            المرجع: <span className="font-mono">{proof.reference}</span>
                          </div>
                        )}
                        {proof.note && (
                          <div className="text-xs text-muted-foreground">{proof.note}</div>
                        )}
                      </div>
                      {proof.proof_url && (
                        <a
                          href={proof.proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-primary"
                        >
                          عرض الإيصال
                        </a>
                      )}
                    </div>
                    <Input
                      placeholder="ملاحظة المراجعة (اختياري)"
                      value={reviewNote[proof.id] || ""}
                      onChange={(event) =>
                        setReviewNote((current) => ({ ...current, [proof.id]: event.target.value }))
                      }
                      className="mb-3"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => void doReview(proof.id, "reject")}
                        disabled={busy === `proof:${proof.id}:reject`}
                      >
                        <XCircle className="me-1 h-4 w-4" />
                        رفض
                      </Button>
                      <Button
                        onClick={() => void doReview(proof.id, "approve")}
                        disabled={busy === `proof:${proof.id}:approve`}
                        className="bg-success hover:opacity-90"
                      >
                        <CheckCircle2 className="me-1 h-4 w-4" />
                        اعتماد
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
}
