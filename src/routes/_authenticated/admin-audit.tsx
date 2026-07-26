import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminListAuditLogs } from "@/lib/admin-core.functions";
import { requireAdminRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin-audit")({
  beforeLoad: requireAdminRoute,
  head: () => ({ meta: [{ title: "سجل العمليات — سوقلي" }] }),
  component: AdminAuditPage,
});

type AuditRow = Awaited<ReturnType<typeof adminListAuditLogs>>["rows"][number];

function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    adminListAuditLogs({ data: { page, pageSize: 30 } })
      .then((result) => {
        setRows(result.rows);
        setTotal(result.total);
      })
      .catch((caught: Error) => setError(caught.message))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <AdminLayout
      title="سجل العمليات"
      description="سجل غير قابل للحذف من الواجهة لكل العمليات الحساسة على المنصة."
      breadcrumbs={[{ label: "النظام" }, { label: "سجل العمليات" }]}
      loading={loading && rows.length === 0}
      error={error}
    >
      <div className="space-y-4">
        {!loading && rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
            لا توجد عمليات مسجلة.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-4 py-3 text-start">العملية</th>
                  <th className="px-4 py-3 text-start">الكيان</th>
                  <th className="px-4 py-3 text-start">المعرّف</th>
                  <th className="px-4 py-3 text-start">المنفذ</th>
                  <th className="px-4 py-3 text-start">التوقيت</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <Badge variant="outline">
                        <History className="me-1 h-3.5 w-3.5" />
                        {row.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">{row.table_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {row.record_id ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {row.user_id?.slice(0, 12) ?? "النظام"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(row.created_at).toLocaleString("ar-EG")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{total} عملية</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
            >
              السابق
            </Button>
            <Button
              variant="outline"
              disabled={page * 30 >= total}
              onClick={() => setPage((value) => value + 1)}
            >
              التالي
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
