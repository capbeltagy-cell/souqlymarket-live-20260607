import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Banknote, Check, X, DollarSign, Settings2, Award } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/currency";
import { adminListWithdrawals, adminUpdateWithdrawal } from "@/lib/marketing.functions";

export const Route = createFileRoute("/_authenticated/admin-withdrawals")({
  head: () => ({ meta: [{ title: "Withdrawals — Admin" }] }),
  component: AdminWithdrawals,
});

const STATUSES = ["pending", "approved", "paid", "rejected", "cancelled", "all"] as const;

function AdminWithdrawals() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fList = useServerFn(adminListWithdrawals);
  const fUpdate = useServerFn(adminUpdateWithdrawal);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("pending");
  const [rows, setRows] = useState<any[]>([]);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await fList({ data: { status } });
      setRows(r.payouts);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  useEffect(() => {
    load();
  }, [status]);

  const act = async (id: string, action: "approve" | "reject" | "paid") => {
    setBusy(id + action);
    try {
      await fUpdate({ data: { id, action, admin_notes: notesMap[id] || null } });
      toast.success(ar ? "تم التحديث" : "Updated");
      load();
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
            <Banknote className="h-6 w-6 text-primary" />
            {ar ? "طلبات السحب" : "Withdrawal requests"}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/admin-commissions">
                <Award className="h-4 w-4" />
                {ar ? "العمولات" : "Commissions"}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/admin-platform-settings">
                <Settings2 className="h-4 w-4" />
                {ar ? "إعدادات المنصة" : "Platform settings"}
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
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {ar ? "لا توجد طلبات" : "No requests"}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((p) => {
                const name =
                  p.profiles?.display_name || p.profiles?.full_name || p.user_id?.slice(0, 8);
                const detailStr = Object.entries(p.payout_methods?.details ?? {})
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ");
                return (
                  <div key={p.id} className="p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold">
                          {formatPrice(Number(p.amount), locale, { showZero: true })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {name} · {new Date(p.created_at).toLocaleString()}
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {p.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.payout_methods?.label ?? "—"} · {p.payout_methods?.kind ?? "—"}
                      {detailStr && <div className="mt-0.5">{detailStr}</div>}
                      {p.notes && <div className="mt-1">📝 {p.notes}</div>}
                      {p.admin_notes && <div className="mt-1">🛡️ {p.admin_notes}</div>}
                    </div>
                    {(p.status === "pending" || p.status === "approved") && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Input
                          placeholder={ar ? "ملاحظة الإدارة (اختياري)" : "Admin note (optional)"}
                          value={notesMap[p.id] ?? ""}
                          onChange={(e) => setNotesMap({ ...notesMap, [p.id]: e.target.value })}
                          className="max-w-xs h-8 text-xs"
                        />
                        {p.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => act(p.id, "approve")}
                              disabled={busy === p.id + "approve"}
                              className="gap-1"
                            >
                              <Check className="h-4 w-4" />
                              {ar ? "اعتماد" : "Approve"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => act(p.id, "reject")}
                              disabled={busy === p.id + "reject"}
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
                          onClick={() => act(p.id, "paid")}
                          disabled={busy === p.id + "paid"}
                          className="gap-1"
                        >
                          <DollarSign className="h-4 w-4" />
                          {ar ? "تم الدفع" : "Mark paid"}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
