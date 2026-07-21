import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, X, DollarSign, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/currency";
import { adminListCommissions, adminReviewCommission } from "@/lib/commissions.functions";
import { requireAdminRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin-commissions")({
  beforeLoad: requireAdminRoute,
  head: () => ({ meta: [{ title: "مراجعة العمولات — لوحة الإدارة — سوقلي" }] }),
  component: AdminCommissions,
});

const STATUSES = ["pending", "approved", "paid", "all"] as const;
type Status = (typeof STATUSES)[number];
type Row = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  notes: string | null;
  created_at: string;
  listing_id: string | null;
  agent_id: string | null;
  company_id: string | null;
  listings?: { title_en?: string; title_ar?: string } | null;
  agents?: { profiles?: { display_name?: string; full_name?: string } | null } | null;
  companies?: { name_en?: string; name_ar?: string } | null;
};

function AdminCommissions() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fList = useServerFn(adminListCommissions);
  const fReview = useServerFn(adminReviewCommission);
  const [status, setStatus] = useState<Status>("pending");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setRows(null);
    setError(null);
    try {
      const result = await fList({ data: { status } });
      setRows(result.commissions as Row[]);
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : ar ? "تعذر تحميل العمولات" : "Unable to load commissions";
      setError(message);
      toast.error(message);
      setRows([]);
    }
  };

  useEffect(() => {
    void load();
  }, [status]);

  const act = async (id: string, action: "approve" | "reject" | "paid") => {
    setBusy(id + action);
    try {
      await fReview({ data: { id, action, notes: notesMap[id] || null } });
      toast.success(ar ? "تم تحديث العمولة" : "Commission updated");
      setConfirmReject(null);
      await load();
    } catch (reason: unknown) {
      toast.error(reason instanceof Error ? reason.message : ar ? "تعذر تحديث العمولة" : "Unable to update commission");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminLayout
      title={ar ? "مراجعة العمولات" : "Commissions review"}
      breadcrumbs={[{ label: ar ? "العمولات" : "Commissions" }]}
      error={error}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-3xl text-sm text-muted-foreground">
            {ar
              ? "راجع العمولات الناتجة عن الطلبات المدفوعة ثم اعتمدها أو ارفضها أو سجّل دفعها للمسوّق."
              : "Review commissions created from paid orders, then approve, reject, or mark them paid."}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin-withdrawals">{ar ? "طلبات السحب" : "Withdrawals"}</Link>
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUSES.map((item) => (
            <Button key={item} size="sm" variant={item === status ? "default" : "outline"} onClick={() => setStatus(item)}>
              {item}
            </Button>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {rows === null ? (
            <div className="p-10 text-center text-muted-foreground"><Loader2 className="inline h-5 w-5 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{ar ? "لا توجد عمولات" : "No commissions"}</div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((commission) => {
                const marketer = commission.agents?.profiles?.display_name || commission.agents?.profiles?.full_name || commission.agent_id?.slice(0, 8) || "—";
                const listingTitle = (ar ? commission.listings?.title_ar : commission.listings?.title_en) ?? commission.listings?.title_en ?? "—";
                const company = (ar ? commission.companies?.name_ar : commission.companies?.name_en) ?? "—";
                const isAuto = (commission.notes ?? "").startsWith("Auto:");
                return (
                  <div key={commission.id} className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-2 font-semibold">
                      {formatPrice(Number(commission.amount), locale, { showZero: true })}
                      <Badge variant="outline">{commission.status}</Badge>
                      {isAuto && <Badge className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">{ar ? "تلقائي" : "Auto"}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {ar ? "المسوّق" : "Marketer"}: {marketer} · {ar ? "الشركة" : "Company"}: {company} · {new Date(commission.created_at).toLocaleString(locale)}
                    </div>
                    {commission.listing_id && (
                      <Link to="/listings/$id" params={{ id: commission.listing_id }} className="text-xs text-primary hover:underline">
                        {listingTitle}
                      </Link>
                    )}
                    {commission.notes && <div className="text-xs text-muted-foreground">📝 {commission.notes}</div>}
                    {(commission.status === "pending" || commission.status === "approved") && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          placeholder={ar ? "ملاحظة الإدارة (اختياري)" : "Admin note (optional)"}
                          value={notesMap[commission.id] ?? ""}
                          onChange={(event) => setNotesMap((current) => ({ ...current, [commission.id]: event.target.value }))}
                          className="h-9 max-w-xs text-xs"
                          maxLength={500}
                        />
                        {commission.status === "pending" && (
                          <>
                            <Button size="sm" onClick={() => act(commission.id, "approve")} disabled={busy === commission.id + "approve"} className="gap-1">
                              <Check className="h-4 w-4" />{ar ? "اعتماد" : "Approve"}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => setConfirmReject(commission)} disabled={busy === commission.id + "reject"} className="gap-1">
                              <X className="h-4 w-4" />{ar ? "رفض وحذف" : "Reject"}
                            </Button>
                          </>
                        )}
                        {commission.status === "approved" && (
                          <Button size="sm" variant="outline" onClick={() => act(commission.id, "paid")} disabled={busy === commission.id + "paid"} className="gap-1">
                            <DollarSign className="h-4 w-4" />{ar ? "تم الدفع" : "Mark paid"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={Boolean(confirmReject)} onOpenChange={(open) => !open && setConfirmReject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ar ? "رفض العمولة؟" : "Reject commission?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {ar ? "سيتم حذف العمولة المعلّقة نهائيًا ولا يمكن التراجع عن هذا الإجراء." : "The pending commission will be permanently deleted. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmReject && act(confirmReject.id, "reject")} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {ar ? "تأكيد الرفض" : "Confirm reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
