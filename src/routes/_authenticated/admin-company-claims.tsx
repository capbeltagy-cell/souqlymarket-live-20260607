import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Building2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdminRoute } from "@/lib/route-guards";
import {
  listCompanyClaimRequests,
  reviewCompanyClaimRequest,
} from "@/lib/company-prospect-ops.functions";

export const Route = createFileRoute("/_authenticated/admin-company-claims")({
  beforeLoad: requireAdminRoute,
  head: () => ({ meta: [{ title: "طلبات ملكية الشركات — سوقلي" }] }),
  component: AdminCompanyClaims,
});

type Row = Awaited<ReturnType<typeof listCompanyClaimRequests>>[number];

function AdminCompanyClaims() {
  const list = useServerFn(listCompanyClaimRequests);
  const review = useServerFn(reviewCompanyClaimRequest);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await list());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحميل الطلبات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => void load(), []);

  const act = async (id: string, status: "approved" | "rejected") => {
    setBusy(id);
    try {
      await review({ data: { id, status } });
      toast.success(status === "approved" ? "تمت الموافقة على الطلب" : "تم رفض الطلب");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الطلب");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminLayout
      title="طلبات ملكية الشركات"
      description="راجع إثباتات ممثلي الشركات قبل تسليم إدارة الصفحة."
      breadcrumbs={[{ label: "طلبات الملكية" }]}
      loading={loading}
    >
      <div className="space-y-4" dir="rtl">
        {rows.map((row) => {
          const company = row.company_prospects as {
            name_ar?: string;
            phone?: string;
            email?: string;
            website?: string;
          } | null;
          return (
            <article key={row.id} className="rounded-xl border bg-card p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <h2 className="font-bold">{company?.name_ar || "شركة غير معروفة"}</h2>
                    <Badge variant={row.status === "approved" ? "default" : "outline"}>
                      {row.status === "pending"
                        ? "قيد المراجعة"
                        : row.status === "approved"
                          ? "مقبول"
                          : "مرفوض"}
                    </Badge>
                  </div>
                  <p className="text-sm">
                    مقدم الطلب: {row.requester_name}
                    {row.job_title ? ` — ${row.job_title}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.requester_phone || row.requester_email || "لا توجد وسيلة تواصل"}
                  </p>
                  {row.evidence_url && (
                    <a
                      className="mt-2 inline-block text-sm text-primary underline"
                      href={row.evidence_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      فتح إثبات الملكية
                    </a>
                  )}
                  {row.note && <p className="mt-2 text-sm text-muted-foreground">{row.note}</p>}
                </div>
                {row.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      disabled={busy === row.id}
                      onClick={() => void act(row.id, "approved")}
                      className="gap-2"
                    >
                      {busy === row.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="h-4 w-4" />
                      )}
                      موافقة
                    </Button>
                    <Button
                      disabled={busy === row.id}
                      variant="destructive"
                      onClick={() => void act(row.id, "rejected")}
                      className="gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      رفض
                    </Button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
        {!rows.length && !loading && (
          <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
            لا توجد طلبات ملكية حتى الآن
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
