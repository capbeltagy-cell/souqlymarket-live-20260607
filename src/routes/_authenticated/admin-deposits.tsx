import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Banknote, CheckCircle2, XCircle } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import {
  adminListCompanyDeposits,
  adminReviewCompanyDeposit,
} from "@/lib/company-wallet.functions";
import { requireAdminRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin-deposits")({
  beforeLoad: requireAdminRoute,
  head: () => ({ meta: [{ title: "مراجعة إيداعات الشركات — Admin" }] }),
  component: AdminDeposits,
});

function fmt(value: unknown) {
  return Number(value ?? 0).toLocaleString("en-EG", { maximumFractionDigits: 2 });
}

function AdminDeposits() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fList = useServerFn(adminListCompanyDeposits);
  const fReview = useServerFn(adminReviewCompanyDeposit);
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [rows, setRows] = useState<Array<Record<string, any>>>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await fList({ data: { status } });
      setRows(result.deposits as Array<Record<string, any>>);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "تعذر تحميل الإيداعات";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [status]);

  async function act(id: string, action: "approve" | "reject") {
    setBusy(id);
    try {
      await fReview({ data: { id, action, admin_notes: notes[id] ?? null } });
      toast.success(action === "approve" ? "تم اعتماد الإيداع" : "تم رفض الإيداع");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "تعذر تحديث الإيداع");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminLayout
      title={ar ? "إيداعات الشركات" : "Company Deposits"}
      breadcrumbs={[{ label: ar ? "الإيداعات" : "Deposits" }]}
      loading={loading}
      error={error}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-gray-700">
          <Banknote className="h-5 w-5 text-blue-600" />
          <p className="text-sm">راجع إثباتات التحويل قبل إضافة الرصيد لمحافظ الشركات.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map((item) => (
            <Button
              key={item}
              size="sm"
              variant={status === item ? "default" : "outline"}
              onClick={() => setStatus(item)}
            >
              {item === "pending"
                ? "قيد المراجعة"
                : item === "approved"
                  ? "معتمدة"
                  : item === "rejected"
                    ? "مرفوضة"
                    : "الكل"}
            </Button>
          ))}
        </div>

        {!loading && rows.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
            {ar ? "لا توجد طلبات إيداع في هذه الحالة." : "No deposits in this status."}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((deposit) => (
              <article key={String(deposit.id)} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {fmt(deposit.amount)} {String(deposit.currency ?? "EGP")}
                    </div>
                    <div className="text-xs text-gray-500">
                      {deposit.companies?.name_ar ?? deposit.companies?.name_en ?? deposit.company_id}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(String(deposit.created_at)).toLocaleString("ar-EG")} · {deposit.method_code ?? "—"}
                      {deposit.reference ? ` · ${deposit.reference}` : ""}
                    </div>
                    {deposit.proof_url ? (
                      <a
                        className="mt-1 inline-block text-xs font-medium text-blue-600 hover:underline"
                        href={String(deposit.proof_url)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        عرض إثبات التحويل
                      </a>
                    ) : null}
                    {deposit.admin_notes ? (
                      <div className="mt-1 text-xs text-gray-500">ملاحظة الإدارة: {String(deposit.admin_notes)}</div>
                    ) : null}
                  </div>
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700">
                    {String(deposit.status)}
                  </span>
                </div>

                {["pending", "under_review"].includes(String(deposit.status)) ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                    <input
                      placeholder={ar ? "ملاحظة الإدارة (اختياري)" : "Admin note (optional)"}
                      className="h-9 min-w-[220px] flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm"
                      value={notes[String(deposit.id)] ?? ""}
                      onChange={(event) =>
                        setNotes((current) => ({ ...current, [String(deposit.id)]: event.target.value }))
                      }
                    />
                    <Button
                      size="sm"
                      disabled={busy === String(deposit.id)}
                      onClick={() => void act(String(deposit.id), "approve")}
                    >
                      <CheckCircle2 className="me-1 h-4 w-4" />
                      اعتماد
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy === String(deposit.id)}
                      onClick={() => void act(String(deposit.id), "reject")}
                    >
                      <XCircle className="me-1 h-4 w-4" />
                      رفض
                    </Button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
