import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  adminGetStoreSummary,
  adminListStores,
  adminUpdateStore,
} from "@/lib/store-admin.functions";
import { requireAdminRoute } from "@/lib/route-guards";
import { toast } from "sonner";
import { BadgeCheck, Star, ExternalLink, History, Store } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin-stores")({
  beforeLoad: requireAdminRoute,
  head: () => ({ meta: [{ title: "إدارة المتاجر — سوقلي" }] }),
  component: AdminStoresPage,
});

type StoreStatus = "all" | "pending_review" | "published" | "rejected" | "suspended";
type StoreAction =
  | "approve"
  | "reject"
  | "verify"
  | "unverify"
  | "feature"
  | "unfeature"
  | "suspend"
  | "unsuspend";

type StoreListResult = Awaited<ReturnType<typeof adminListStores>>;
type StoreItem = StoreListResult["items"][number];
type StoreSummary = Awaited<ReturnType<typeof adminGetStoreSummary>>;
type AuditLog = StoreSummary["auditLogs"][number];

const STATUS_LABELS: Record<StoreStatus, string> = {
  all: "الكل",
  pending_review: "قيد المراجعة",
  published: "معتمدة",
  rejected: "مرفوضة",
  suspended: "موقوفة",
};

function AdminStoresPage() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [status, setStatus] = useState<StoreStatus>("pending_review");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<StoreSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const [result, overview] = await Promise.all([
        adminListStores({ data: { status } }),
        adminGetStoreSummary(),
      ]);
      setItems(result.items);
      setSummary(overview);
    } catch (caught: unknown) {
      const message = caught instanceof Error ? caught.message : "تعذر تحميل المتاجر";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [status]);

  async function act(id: string, action: StoreAction, reason?: string) {
    try {
      await adminUpdateStore({ data: { id, action, reason: reason ?? null } });
      toast.success("تم تحديث حالة المتجر بنجاح");
      await reload();
    } catch (caught: unknown) {
      toast.error(caught instanceof Error ? caught.message : "تعذر تنفيذ الإجراء");
    }
  }

  return (
    <AdminLayout
      title="إدارة المتاجر"
      breadcrumbs={[{ label: "المتاجر" }]}
      loading={loading && !summary}
      error={error}
    >
      <div className="space-y-5">
        {summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <SummaryCard label="الإجمالي" value={summary.counts.total} />
            <SummaryCard label="قيد المراجعة" value={summary.counts.pending_review} />
            <SummaryCard label="معتمدة" value={summary.counts.published} />
            <SummaryCard label="موثّقة" value={summary.counts.verified} />
            <SummaryCard label="مميّزة" value={summary.counts.featured} />
            <SummaryCard label="موقوفة" value={summary.counts.suspended} />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_LABELS) as StoreStatus[]).map((value) => (
            <button
              type="button"
              key={value}
              onClick={() => setStatus(value)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                status === value
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {STATUS_LABELS[value]}
            </button>
          ))}
        </div>

        {!loading && items.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
            لا توجد متاجر في هذه الحالة
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((store) => (
              <div
                key={store.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-100">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt={store.name_ar ?? "شعار المتجر"} className="h-full w-full object-cover" />
                  ) : null}
                </div>

                <div className="min-w-[220px] flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-gray-900">{store.name_ar}</div>
                    {store.is_verified && <BadgeCheck className="h-4 w-4 text-blue-700" />}
                    {store.is_featured && <Star className="h-4 w-4 text-amber-500" />}
                  </div>
                  <div className="text-xs text-gray-500">
                    /stores/{store.slug} • {store.status}
                  </div>
                  {store.rejection_reason ? (
                    <div className="mt-1 text-xs text-red-600">{store.rejection_reason}</div>
                  ) : null}
                </div>

                <a
                  href={`/stores/${store.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-sm font-medium text-blue-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  معاينة
                </a>

                <div className="flex flex-wrap gap-2">
                  {store.status === "pending_review" && (
                    <>
                      <Button size="sm" onClick={() => void act(store.id, "approve")}>
                        اعتماد
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const reason = window.prompt("اكتب سبب الرفض");
                          if (reason?.trim()) void act(store.id, "reject", reason.trim());
                        }}
                      >
                        رفض
                      </Button>
                    </>
                  )}

                  {store.status === "published" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void act(store.id, store.is_verified ? "unverify" : "verify")}
                      >
                        {store.is_verified ? "إلغاء التوثيق" : "توثيق"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void act(store.id, store.is_featured ? "unfeature" : "feature")}
                      >
                        {store.is_featured ? "إلغاء التمييز" : "تمييز"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const reason = window.prompt("اكتب سبب الإيقاف");
                          if (reason?.trim()) void act(store.id, "suspend", reason.trim());
                        }}
                      >
                        إيقاف
                      </Button>
                    </>
                  )}

                  {store.status === "suspended" && (
                    <Button size="sm" onClick={() => void act(store.id, "unsuspend")}>
                      إعادة التفعيل
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {summary?.auditLogs?.length ? (
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
              <History className="h-4 w-4 text-blue-700" />
              سجل عمليات المتاجر
            </h2>
            <div className="divide-y divide-gray-100">
              {summary.auditLogs.map((log: AuditLog) => (
                <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                  <span className="flex items-center gap-1.5 text-gray-700">
                    <Store className="h-3.5 w-3.5 text-gray-400" />
                    {log.action} — {String(log.record_id).slice(0, 8)}
                  </span>
                  <time className="text-gray-500">
                    {new Date(log.created_at).toLocaleString("ar-EG")}
                  </time>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-2xl font-bold text-blue-700">{value}</div>
      <div className="mt-1 text-xs text-gray-500">{label}</div>
    </div>
  );
}
