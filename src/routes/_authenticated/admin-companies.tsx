import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Crown, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { adminListCompanies, adminSetCompanyPaid } from "@/lib/subscription.functions";
import { adminSetCompanyVerified } from "@/lib/phase2.functions";
import { requireAdminRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin-companies")({
  beforeLoad: requireAdminRoute,
  head: () => ({ meta: [{ title: "إدارة الشركات — سوقلي" }] }),
  component: AdminCompanies,
});

type Row = Awaited<ReturnType<typeof adminListCompanies>>[number];

function AdminCompanies() {
  const { roles } = useAuth();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const list = useServerFn(adminListCompanies);
  const setPaid = useServerFn(adminSetCompanyPaid);
  const setVerified = useServerFn(adminSetCompanyVerified);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = roles.includes("admin");

  const load = () => {
    setError(null);
    return list()
      .then(setRows)
      .catch((e: Error) => {
        setError(e.message);
        toast.error(e.message);
      });
  };

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin]);

  const toggle = async (row: Row, paid: boolean) => {
    setBusy(row.id);
    try {
      await setPaid({ data: { companyId: row.id, paid, months: 1 } });
      toast.success(
        paid
          ? ar
            ? "تم تفعيل الاشتراك للشركة"
            : "Subscription activated"
          : ar
            ? "تم إلغاء الاشتراك للشركة"
            : "Subscription deactivated",
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : ar ? "تعذر تحديث الاشتراك" : "Update failed");
    } finally {
      setBusy(null);
    }
  };

  const toggleVerify = async (row: Row) => {
    setBusy(row.id);
    try {
      await setVerified({ data: { companyId: row.id, verified: !row.is_verified } });
      toast.success(ar ? "تم تحديث حالة توثيق الشركة" : "Verification updated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : ar ? "تعذر تحديث التوثيق" : "Update failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminLayout
      title={ar ? "إدارة الشركات" : "Companies"}
      breadcrumbs={[{ label: ar ? "الشركات" : "Companies" }]}
      loading={isAdmin && rows === null && !error}
      error={error}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-primary" />
          <p className="text-sm text-muted-foreground">
            {ar
              ? "مراجعة توثيق الشركات وإدارة حالة الاشتراك من مكان واحد."
              : "Manage company verification and subscription status."}
          </p>
        </div>

        {rows && rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
            {ar ? "لا توجد شركات حتى الآن" : "No companies found"}
          </div>
        ) : rows ? (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-start">{ar ? "الشركة" : "Company"}</th>
                  <th className="px-4 py-3 text-start">{ar ? "الاشتراك" : "Subscription"}</th>
                  <th className="px-4 py-3 text-start">{ar ? "تاريخ الانتهاء" : "Expires"}</th>
                  <th className="px-4 py-3 text-start">{ar ? "التوثيق" : "Verified"}</th>
                  <th className="px-4 py-3 text-end">{ar ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border align-middle">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 font-medium">
                        {row.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                        {ar ? row.name_ar : row.name_en}
                      </div>
                      <div className="text-xs text-muted-foreground">{row.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-3">
                      {row.isPaid ? (
                        <Badge className="bg-success text-success-foreground hover:bg-success">
                          {ar ? "مفعّل" : "Active"}
                        </Badge>
                      ) : (
                        <Badge variant="outline">{ar ? "مجاني" : "Free"}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {row.subscription_expires_at
                        ? new Date(row.subscription_expires_at).toLocaleDateString(ar ? "ar-EG" : "en-US")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {row.is_verified ? (
                        <Badge className="gap-1 bg-primary text-primary-foreground">
                          <BadgeCheck className="h-3 w-3" />
                          {ar ? "موثقة" : "Verified"}
                        </Badge>
                      ) : (
                        <Badge variant="outline">{ar ? "غير موثقة" : "Unverified"}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="flex flex-wrap justify-end gap-2">
                        {row.isPaid ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === row.id}
                            onClick={() => void toggle(row, false)}
                            className="gap-1"
                          >
                            <ShieldOff className="h-4 w-4" />
                            {ar ? "إلغاء الاشتراك" : "Deactivate"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={busy === row.id}
                            onClick={() => void toggle(row, true)}
                            className="gap-1"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            {ar ? "تفعيل شهر" : "Activate 1 month"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === row.id}
                          onClick={() => void toggleVerify(row)}
                          className="gap-1"
                        >
                          {busy === row.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <BadgeCheck className="h-4 w-4" />
                          )}
                          {row.is_verified
                            ? ar
                              ? "إلغاء التوثيق"
                              : "Unverify"
                            : ar
                              ? "توثيق"
                              : "Verify"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
