import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Banknote, CheckCircle2, XCircle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import {
  adminListCompanyDeposits,
  adminReviewCompanyDeposit,
} from "@/lib/company-wallet.functions";

export const Route = createFileRoute("/_authenticated/admin-deposits")({
  head: () => ({ meta: [{ title: "مراجعة إيداعات الشركات — Admin" }] }),
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: AdminDeposits,
});

function fmt(n: any) {
  return Number(n ?? 0).toLocaleString("en-EG", { maximumFractionDigits: 2 });
}

function AdminDeposits() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fList = useServerFn(adminListCompanyDeposits);
  const fReview = useServerFn(adminReviewCompanyDeposit);
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [rows, setRows] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fList({ data: { status } });
      setRows(r.deposits);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, [status]);

  async function act(id: string, action: "approve" | "reject") {
    setBusy(id);
    try {
      await fReview({ data: { id, action, admin_notes: notes[id] ?? null } });
      toast.success(ar ? "تم الحفظ" : "Saved");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-4">
          <Banknote className="h-6 w-6 text-primary" />
          {ar ? "إيداعات الشركات" : "Company Deposits"}
        </h1>
        <div className="mb-4 flex gap-2 flex-wrap">
          {(["pending", "approved", "rejected", "all"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "default" : "outline"}
              onClick={() => setStatus(s)}
            >
              {s}
            </Button>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {ar ? "لا توجد طلبات." : "No deposits."}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((d) => (
              <div key={d.id} className="rounded-lg border border-border bg-card p-4 shadow-card">
                <div className="flex justify-between items-start flex-wrap gap-3">
                  <div>
                    <div className="font-semibold">
                      {fmt(d.amount)} {d.currency}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {d.companies?.name_ar ?? d.companies?.name_en ?? d.company_id}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleString()} · {d.method_code ?? "n/a"}
                      {d.reference ? ` · ${d.reference}` : ""}
                    </div>
                    {d.proof_url && (
                      <a
                        className="text-xs text-primary underline"
                        href={d.proof_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {ar ? "إثبات التحويل" : "Proof"}
                      </a>
                    )}
                    {d.admin_notes && (
                      <div className="text-xs text-muted-foreground mt-1">📝 {d.admin_notes}</div>
                    )}
                  </div>
                  <div className="text-xs uppercase font-medium">{d.status}</div>
                </div>
                {["pending", "under_review"].includes(d.status) && (
                  <div className="mt-3 flex flex-wrap gap-2 items-center">
                    <input
                      placeholder={ar ? "ملاحظة (اختياري)" : "Note (optional)"}
                      className="flex-1 min-w-[220px] h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={notes[d.id] ?? ""}
                      onChange={(e) => setNotes({ ...notes, [d.id]: e.target.value })}
                    />
                    <Button size="sm" disabled={busy === d.id} onClick={() => act(d.id, "approve")}>
                      <CheckCircle2 className="h-4 w-4 me-1" />
                      {ar ? "اعتماد" : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy === d.id}
                      onClick={() => act(d.id, "reject")}
                    >
                      <XCircle className="h-4 w-4 me-1" />
                      {ar ? "رفض" : "Reject"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
