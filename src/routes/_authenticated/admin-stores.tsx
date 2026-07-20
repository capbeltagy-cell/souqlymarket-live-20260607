import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import {
  adminGetStoreSummary,
  adminListStores,
  adminUpdateStore,
} from "@/lib/store-admin.functions";
import { useAuth } from "@/hooks/useAuth";
import { requireAdminRoute } from "@/lib/route-guards";
import { toast } from "sonner";
import { BadgeCheck, Star, ExternalLink, History, Store } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin-stores")({
  beforeLoad: requireAdminRoute,
  head: () => ({ meta: [{ title: "إدارة المتاجر — سوقلي" }] }),
  component: AdminStoresPage,
});

function AdminStoresPage() {
  const { roles, loading: authLoading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState<
    "all" | "pending_review" | "published" | "rejected" | "suspended"
  >("pending_review");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);

  async function reload() {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        adminListStores({ data: { status } }),
        adminGetStoreSummary(),
      ]);
      setItems(r.items);
      setSummary(s);
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading && roles.includes("admin")) reload();
  }, [status, authLoading, roles]);

  if (!authLoading && !roles.includes("admin")) return <Navigate to="/" />;

  async function act(id: string, action: any, reason?: string) {
    try {
      await adminUpdateStore({ data: { id, action, reason: reason ?? null } });
      toast.success("تم");
      await reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="min-h-screen bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-6 space-y-4">
        <h1 className="text-2xl font-bold">إدارة المتاجر</h1>
        {summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <SummaryCard label="الإجمالي" value={summary.counts.total} />
            <SummaryCard label="قيد المراجعة" value={summary.counts.pending_review} />
            <SummaryCard label="منشور" value={summary.counts.published} />
            <SummaryCard label="موثّق" value={summary.counts.verified} />
            <SummaryCard label="مميّز" value={summary.counts.featured} />
            <SummaryCard label="موقوف" value={summary.counts.suspended} />
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          {(["all", "pending_review", "published", "rejected", "suspended"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-sm border ${status === s ? "bg-primary text-primary-foreground" : "bg-card"}`}
            >
              {s === "all"
                ? "الكل"
                : s === "pending_review"
                  ? "مراجعة"
                  : s === "published"
                    ? "منشور"
                    : s === "rejected"
                      ? "مرفوض"
                      : "موقوف"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-muted-foreground">…</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl bg-card border border-border p-8 text-center text-muted-foreground">
            لا توجد متاجر
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((s) => (
              <div
                key={s.id}
                className="rounded-xl bg-card border border-border p-4 flex flex-wrap items-center gap-4"
              >
                <div className="h-12 w-12 rounded-full bg-muted overflow-hidden">
                  {s.logo_url && (
                    <img src={s.logo_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">{s.name_ar}</div>
                    {s.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                    {s.is_featured && <Star className="h-4 w-4 text-warning" />}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    /stores/{s.slug} • {s.status}
                  </div>
                  {s.rejection_reason && (
                    <div className="text-xs text-destructive mt-1">{s.rejection_reason}</div>
                  )}
                </div>
                <a
                  href={`/stores/${s.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary flex items-center gap-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  معاينة
                </a>
                <div className="flex gap-1 flex-wrap">
                  {s.status === "pending_review" && (
                    <>
                      <Button size="sm" onClick={() => act(s.id, "approve")}>
                        موافقة
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const r = prompt("سبب الرفض؟");
                          if (r) act(s.id, "reject", r);
                        }}
                      >
                        رفض
                      </Button>
                    </>
                  )}
                  {s.status === "published" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => act(s.id, s.is_verified ? "unverify" : "verify")}
                      >
                        {s.is_verified ? "إلغاء التوثيق" : "توثيق"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => act(s.id, s.is_featured ? "unfeature" : "feature")}
                      >
                        {s.is_featured ? "إلغاء التميز" : "مميز"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const r = prompt("سبب الإيقاف؟");
                          if (r) act(s.id, "suspend", r);
                        }}
                      >
                        إيقاف
                      </Button>
                    </>
                  )}
                  {s.status === "suspended" && (
                    <Button size="sm" onClick={() => act(s.id, "unsuspend")}>
                      إعادة تفعيل
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {summary?.auditLogs?.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <History className="h-4 w-4 text-primary" />
              سجل عمليات المتاجر
            </h2>
            <div className="divide-y divide-border">
              {summary.auditLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
                >
                  <span className="flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5 text-muted-foreground" />
                    {log.action} — {String(log.record_id).slice(0, 8)}
                  </span>
                  <time className="text-muted-foreground">
                    {new Date(log.created_at).toLocaleString("ar-EG")}
                  </time>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
