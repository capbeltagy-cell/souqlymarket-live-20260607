import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Award, Check, X, DollarSign, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
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

export const Route = createFileRoute("/_authenticated/admin-commissions")({
  head: () => ({ meta: [{ title: "Commissions Review — Admin" }] }),
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
  agents?: {
    headline_en?: string;
    profiles?: { display_name?: string; full_name?: string } | null;
  } | null;
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

  const load = async () => {
    setRows(null);
    try {
      const r = await fList({ data: { status } });
      setRows(r.commissions as Row[]);
    } catch (e) {
      toast.error((e as Error).message);
      setRows([]);
    }
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [status]);

  const act = async (id: string, action: "approve" | "reject" | "paid") => {
    setBusy(id + action);
    try {
      await fReview({ data: { id, action, notes: notesMap[id] || null } });
      toast.success(ar ? "تم التحديث" : "Updated");
      setConfirmReject(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            {ar ? "مراجعة العمولات" : "Commissions review"}
          </h1>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin-withdrawals">{ar ? "طلبات السحب" : "Withdrawals"}</Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          {ar
            ? "العمولات المُنشأة تلقائياً عند دفع الطلبات تظهر هنا كـ«معلّقة». اعتمدها لإضافتها إلى محفظة المسوّق، أو ارفضها لحذفها بأمان."
            : "Commissions auto-created when orders are paid appear here as pending. Approve to move them toward the marketer's wallet, or reject to safely remove."}
        </p>

        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={s === status ? "default" : "outline"}
              onClick={() => setStatus(s)}
            >
              {s}
            </Button>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
          {rows === null ? (
            <div className="p-10 text-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin inline" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {ar ? "لا توجد عمولات" : "No commissions"}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((c) => {
                const marketer =
                  c.agents?.profiles?.display_name ||
                  c.agents?.profiles?.full_name ||
                  c.agent_id?.slice(0, 8) ||
                  "—";
                const listingTitle =
                  (ar ? c.listings?.title_ar : c.listings?.title_en) ?? c.listings?.title_en ?? "—";
                const company = (ar ? c.companies?.name_ar : c.companies?.name_en) ?? "—";
                const isAuto = (c.notes ?? "").startsWith("Auto:");
                return (
                  <div key={c.id} className="p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold flex items-center gap-2 flex-wrap">
                          {formatPrice(Number(c.amount), locale, { showZero: true })}
                          <Badge variant="outline">{c.status}</Badge>
                          {isAuto && (
                            <Badge className="bg-primary/10 text-primary border-primary/20">
                              {ar ? "تلقائي" : "Auto"}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {ar ? "مسوّق" : "Marketer"}:{" "}
                          <span className="font-medium text-foreground">{marketer}</span>
                          {" · "}
                          {ar ? "شركة" : "Company"}: {company}
                          {" · "}
                          {new Date(c.created_at).toLocaleString()}
                        </div>
                        {c.listing_id && (
                          <Link
                            to="/listings/$id"
                            params={{ id: c.listing_id }}
                            className="text-xs text-primary hover:underline"
                          >
                            {listingTitle}
                          </Link>
                        )}
                        {c.notes && (
                          <div className="text-xs text-muted-foreground mt-1">📝 {c.notes}</div>
                        )}
                      </div>
                    </div>

                    {(c.status === "pending" || c.status === "approved") && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Input
                          placeholder={ar ? "ملاحظة الإدارة (اختياري)" : "Admin note (optional)"}
                          value={notesMap[c.id] ?? ""}
                          onChange={(e) => setNotesMap({ ...notesMap, [c.id]: e.target.value })}
                          className="max-w-xs h-8 text-xs"
                          maxLength={500}
                        />
                        {c.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => act(c.id, "approve")}
                              disabled={busy === c.id + "approve"}
                              className="gap-1"
                            >
                              <Check className="h-4 w-4" />
                              {ar ? "اعتماد" : "Approve"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setConfirmReject(c)}
                              disabled={busy === c.id + "reject"}
                              className="gap-1"
                            >
                              <X className="h-4 w-4" />
                              {ar ? "رفض وحذف" : "Reject"}
                            </Button>
                          </>
                        )}
                        {c.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => act(c.id, "paid")}
                            disabled={busy === c.id + "paid"}
                            className="gap-1"
                          >
                            <DollarSign className="h-4 w-4" />
                            {ar ? "تم الدفع" : "Mark paid"}
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

      <AlertDialog open={!!confirmReject} onOpenChange={(o) => !o && setConfirmReject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ar ? "رفض العمولة؟" : "Reject commission?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {ar
                ? "سيتم حذف العمولة المعلّقة نهائياً. لا يمكن التراجع عن هذا الإجراء."
                : "The pending commission will be permanently deleted. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmReject && act(confirmReject.id, "reject")}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {ar ? "تأكيد الرفض" : "Confirm reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SiteFooter />
    </div>
  );
}
