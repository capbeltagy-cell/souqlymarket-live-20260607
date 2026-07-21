import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Banknote, Check, X, DollarSign, Settings2, Award } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/currency";
import { adminListWithdrawals, adminUpdateWithdrawal } from "@/lib/marketing.functions";
import { requireAdminRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin-withdrawals")({
  beforeLoad: requireAdminRoute,
  head: () => ({ meta: [{ title: "طلبات السحب — سوقلي" }] }),
  component: AdminWithdrawals,
});

const STATUSES = ["pending", "approved", "paid", "rejected", "cancelled", "all"] as const;
type WithdrawalStatus = (typeof STATUSES)[number];
type WithdrawalRow = Awaited<ReturnType<typeof adminListWithdrawals>>["payouts"][number];

const STATUS_LABELS: Record<WithdrawalStatus, { ar: string; en: string }> = {
  pending: { ar: "معلقة", en: "Pending" },
  approved: { ar: "معتمدة", en: "Approved" },
  paid: { ar: "مدفوعة", en: "Paid" },
  rejected: { ar: "مرفوضة", en: "Rejected" },
  cancelled: { ar: "ملغاة", en: "Cancelled" },
  all: { ar: "الكل", en: "All" },
};

function AdminWithdrawals() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fList = useServerFn(adminListWithdrawals);
  const fUpdate = useServerFn(adminUpdateWithdrawal);
  const [status, setStatus] = useState<WithdrawalStatus>("pending");
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fList({ data: { status } });
      setRows(result.payouts);
    } catch (e) {
      const message = e instanceof Error ? e.message : ar ? "تعذر تحميل طلبات السحب" : "Failed to load withdrawals";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [status]);

  const act = async (id: string, action: "approve" | "reject" | "paid") => {
    setBusy(`${id}:${action}`);
    try {
      await fUpdate({ data: { id, action, admin_notes: notesMap[id] || null } });
      toast.success(ar ? "تم تحديث طلب السحب بنجاح" : "Withdrawal updated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : ar ? "تعذر تحديث الطلب" : "Update failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminLayout
      title={ar ? "طلبات سحب المسوقين" : "Marketer withdrawals"}
      breadcrumbs={[{ label: ar ? "طلبات السحب" : "Withdrawals" }]}
      loading={loading}
      error={error}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Banknote className="h-5 w-5 text-primary" />
            <span>{ar ? "مراجعة واعتماد طلبات سحب عمولات المسوقين فقط." : "Review marketer commission withdrawals."}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/admin-commissions">
                <Award className="h-4 w-4" />
                {ar ? "العمولات" : "Commissions"}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/admin-platform-settings">
                <Settings2 className="h-4 w-4" />
                {ar ? "الإعدادات" : "Settings"}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/admin-revenue">
                <DollarSign className="h-4 w-4" />
                {ar ? "الإيرادات" : "Revenue"}
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUSES.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={item === status ? "default" : "outline"}
              onClick={() => setStatus(item)}
            >
              {ar ? STATUS_LABELS[item].ar : STATUS_LABELS[item].en}
            </Button>
          ))}
        </div>

        {!loading && rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            {ar ? "لا توجد طلبات سحب في هذه الحالة" : "No withdrawal requests found"}
          </div>
        ) : !loading ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <div className="divide-y divide-border">
              {rows.map((row) => {
                const name =
                  row.profiles?.display_name || row.profiles?.full_name || row.user_id?.slice(0, 8);
                const detailStr = Object.entries(row.payout_methods?.details ?? {})
                  .map(([key, value]) => `${key}: ${String(value)}`)
                  .join(" · ");
                return (
                  <div key={row.id} className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold">
                          {formatPrice(Number(row.amount), locale, { showZero: true })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {name} · {new Date(row.created_at).toLocaleString(ar ? "ar-EG" : "en-US")}
                        </div>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {row.status}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {row.payout_methods?.label ?? "—"} · {row.payout_methods?.kind ?? "—"}
                      {detailStr && <div className="mt-1">{detailStr}</div>}
                      {row.notes && <div className="mt-1">ملاحظة المسوق: {row.notes}</div>}
                      {row.admin_notes && <div className="mt-1">ملاحظة الإدارة: {row.admin_notes}</div>}
                    </div>

                    {(row.status === "pending" || row.status === "approved") && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Input
                          placeholder={ar ? "ملاحظة الإدارة (اختياري)" : "Admin note (optional)"}
                          value={notesMap[row.id] ?? ""}
                          onChange={(event) =>
                            setNotesMap((current) => ({ ...current, [row.id]: event.target.value }))
                          }
                          className="h-9 max-w-sm text-xs"
                        />
                        {row.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => void act(row.id, "approve")}
                              disabled={busy === `${row.id}:approve`}
                              className="gap-1"
                            >
                              <Check className="h-4 w-4" />
                              {ar ? "اعتماد" : "Approve"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => void act(row.id, "reject")}
                              disabled={busy === `${row.id}:reject`}
                              className="gap-1"
                            >
                              <X className="h-4 w-4" />
                              {ar ? "رفض" : "Reject"}
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void act(row.id, "paid")}
                          disabled={busy === `${row.id}:paid`}
                          className="gap-1"
                        >
                          <DollarSign className="h-4 w-4" />
                          {ar ? "تأكيد الدفع" : "Mark paid"}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
