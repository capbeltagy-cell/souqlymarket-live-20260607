import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, RefreshCw, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/AdminLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  adminListManualPayments,
  reviewManualPayment,
  type ManualPaymentRequest,
} from "@/lib/manual-payments.functions";
import { requireAdminRoute } from "@/lib/route-guards";

type FilterStatus = "all" | "pending" | "approved" | "rejected";

export const Route = createFileRoute("/_authenticated/admin-manual-payments")({
  beforeLoad: requireAdminRoute,
  head: () => ({ meta: [{ title: "طلبات الدفع اليدوي — إدارة سوقلي" }] }),
  component: AdminManualPayments,
});

function requestStatus(status: ManualPaymentRequest["status"]) {
  if (status === "approved")
    return <Badge className="bg-success text-success-foreground">مقبول</Badge>;
  if (status === "rejected") return <Badge variant="destructive">مرفوض</Badge>;
  return <Badge variant="secondary">قيد المراجعة</Badge>;
}

function AdminManualPayments() {
  const list = useServerFn(adminListManualPayments);
  const review = useServerFn(reviewManualPayment);
  const [items, setItems] = useState<ManualPaymentRequest[]>([]);
  const [status, setStatus] = useState<FilterStatus>("pending");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await list({ data: { search: appliedSearch, status } });
      setItems(result.items);
      setUnavailable(result.unavailable);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل طلبات الدفع");
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, list, status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleReview = async (requestId: string, action: "approve" | "reject") => {
    const reason = reasons[requestId]?.trim() || "";
    if (action === "reject" && reason.length < 3) {
      toast.error("اكتب سبب الرفض ليظهر للمستخدم");
      return;
    }
    setBusy(`${requestId}:${action}`);
    try {
      await review({
        data: {
          action,
          rejectionReason: action === "reject" ? reason : null,
          requestId,
        },
      });
      toast.success(
        action === "approve" ? "تم التفعيل وتسجيل الدفع" : "تم رفض الطلب وإخطار المستخدم",
      );
      await refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "تعذر مراجعة الطلب");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminLayout
      title="طلبات الدفع اليدوي"
      breadcrumbs={[{ label: "المالية" }, { label: "طلبات الدفع اليدوي" }]}
      loading={loading}
      error={error}
    >
      <div className="space-y-5">
        <Alert>
          <AlertTitle>مراجعة مالية حساسة</AlertTitle>
          <AlertDescription>
            الموافقة تفعّل الاشتراك وتُنشئ سجل الدفع والإشعار وسجل التدقيق داخل Transaction واحدة.
            راجع المبلغ ورقم المحوّل وصورة الإثبات قبل الموافقة.
          </AlertDescription>
        </Alert>

        {unavailable && (
          <Alert variant="destructive">
            <AlertTitle>تحديث قاعدة البيانات مطلوب</AlertTitle>
            <AlertDescription>
              هذه الوحدة جاهزة وستعمل بعد تطبيق تحديثات قاعدة البيانات على بيئة الاختبار.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[1fr_190px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="ps-9"
              placeholder="ابحث باسم المستخدم أو الشركة أو رقم الهاتف"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") setAppliedSearch(search.trim());
              }}
            />
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as FilterStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="pending">قيد المراجعة</SelectItem>
              <SelectItem value="approved">مقبولة</SelectItem>
              <SelectItem value="rejected">مرفوضة</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button type="button" onClick={() => setAppliedSearch(search.trim())}>
              بحث
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void refresh()}
              aria-label="تحديث"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!loading && !unavailable && items.length === 0 && (
          <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
            لا توجد طلبات مطابقة
          </div>
        )}

        <div className="grid gap-4">
          {items.map((request) => (
            <article key={request.id} className="rounded-xl border bg-card p-4 shadow-card sm:p-5">
              <div className="grid gap-5 xl:grid-cols-[1fr_240px]">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold">{request.companyName || "شركة غير مسماة"}</h2>
                      <p className="text-sm text-muted-foreground">
                        {request.userName || "مستخدم"} · {request.sender_phone}
                      </p>
                    </div>
                    {requestStatus(request.status)}
                  </div>

                  <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <dt className="text-muted-foreground">الباقة</dt>
                      <dd className="font-medium">الشركات المميزة — شهر</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">المبلغ</dt>
                      <dd className="font-bold text-primary">
                        {(request.amount_cents / 100).toLocaleString("ar-EG")} {request.currency}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">الطريقة</dt>
                      <dd>{request.payment_method === "instapay" ? "إنستا باي" : "فودافون كاش"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">وقت التحويل</dt>
                      <dd>{new Date(request.transferred_at).toLocaleString("ar-EG")}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">تاريخ الطلب</dt>
                      <dd>{new Date(request.created_at).toLocaleString("ar-EG")}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">المرجع</dt>
                      <dd className="font-mono">{request.transfer_reference || "—"}</dd>
                    </div>
                  </dl>

                  {request.notes && (
                    <div className="rounded-lg bg-muted/50 p-3 text-sm">{request.notes}</div>
                  )}
                  {request.status === "rejected" && request.rejection_reason && (
                    <Alert variant="destructive">
                      <AlertTitle>سبب الرفض</AlertTitle>
                      <AlertDescription>{request.rejection_reason}</AlertDescription>
                    </Alert>
                  )}

                  {request.status === "pending" && (
                    <div className="space-y-3 border-t pt-4">
                      <Textarea
                        placeholder="سبب الرفض — مطلوب عند الرفض"
                        maxLength={500}
                        value={reasons[request.id] || ""}
                        onChange={(event) =>
                          setReasons((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                      />
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant="outline"
                          disabled={busy !== null}
                          onClick={() => void handleReview(request.id, "reject")}
                        >
                          <XCircle className="me-2 h-4 w-4" />
                          رفض
                        </Button>
                        <Button
                          className="bg-success text-success-foreground hover:opacity-90"
                          disabled={busy !== null}
                          onClick={() => void handleReview(request.id, "approve")}
                        >
                          <CheckCircle2 className="me-2 h-4 w-4" />
                          موافقة وتفعيل
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="mb-3 text-sm font-medium">صورة إثبات الدفع</p>
                  {request.proofUrl ? (
                    <a
                      href={request.proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group block"
                    >
                      <img
                        src={request.proofUrl}
                        alt="إثبات الدفع"
                        loading="lazy"
                        className="aspect-[4/3] w-full rounded-lg border object-cover"
                      />
                      <span className="mt-2 flex items-center justify-center gap-2 text-xs text-primary">
                        فتح بالحجم الكامل <ExternalLink className="h-3.5 w-3.5" />
                      </span>
                    </a>
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center rounded-lg border text-xs text-muted-foreground">
                      تعذر إنشاء رابط مؤقت للصورة
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
