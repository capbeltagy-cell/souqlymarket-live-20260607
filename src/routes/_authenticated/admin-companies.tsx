import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Crown, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { adminListCompanies, adminSetCompanyPaid } from "@/lib/subscription.functions";
import { adminSetCompanyVerified } from "@/lib/phase2.functions";

export const Route = createFileRoute("/_authenticated/admin-companies")({
  head: () => ({ meta: [{ title: "Admin · Companies — Souqly" }] }),
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
  const isAdmin = roles.includes("admin");

  const load = () =>
    list()
      .then(setRows)
      .catch((e: Error) => toast.error(e.message));

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const toggle = async (row: Row, paid: boolean) => {
    setBusy(row.id);
    try {
      await setPaid({ data: { companyId: row.id, paid, months: 1 } });
      toast.success(
        paid
          ? ar
            ? "تم تفعيل الاشتراك"
            : "Subscription activated"
          : ar
            ? "تم إلغاء الاشتراك"
            : "Subscription deactivated",
      );
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const toggleVerify = async (row: Row) => {
    setBusy(row.id);
    try {
      await setVerified({ data: { companyId: row.id, verified: !row.is_verified } });
      toast.success(ar ? "تم تحديث التوثيق" : "Verification updated");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (!isAdmin)
    return (
      <Shell>
        <div className="p-10 text-center text-muted-foreground">
          {ar ? "للمسؤولين فقط" : "Admins only"}
        </div>
      </Shell>
    );

  return (
    <Shell>
      <div className="flex items-center gap-2 mb-6">
        <Crown className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">
          {ar ? "إدارة اشتراكات الشركات" : "Company subscriptions"}
        </h1>
      </div>
      {!rows ? (
        <div className="p-10 text-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin inline" />
        </div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground">
          {ar ? "لا توجد شركات" : "No companies"}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2">
              <tr className="text-start">
                <th className="px-4 py-3 text-start">{ar ? "الشركة" : "Company"}</th>
                <th className="px-4 py-3 text-start">{ar ? "الاشتراك" : "Subscription"}</th>
                <th className="px-4 py-3 text-start">{ar ? "تنتهي" : "Expires"}</th>
                <th className="px-4 py-3 text-start">{ar ? "التوثيق" : "Verified"}</th>
                <th className="px-4 py-3 text-end">{ar ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium flex items-center gap-1">
                      {r.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                      {ar ? r.name_ar : r.name_en}
                    </div>
                    <div className="text-xs text-muted-foreground">{r.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-4 py-3">
                    {r.isPaid ? (
                      <Badge className="bg-success text-success-foreground hover:bg-success">
                        {ar ? "مدفوعة" : "Paid"}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{ar ? "مجانية" : "Free"}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {r.subscription_expires_at
                      ? new Date(r.subscription_expires_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {r.is_verified ? (
                      <Badge className="bg-primary text-primary-foreground gap-1">
                        <BadgeCheck className="h-3 w-3" />
                        {ar ? "موثقة" : "Verified"}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{ar ? "غير موثقة" : "Unverified"}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-end space-x-1 rtl:space-x-reverse">
                    {r.isPaid ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === r.id}
                        onClick={() => toggle(r, false)}
                        className="gap-1"
                      >
                        <ShieldOff className="h-4 w-4" />
                        {ar ? "إلغاء" : "Unpay"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary-hover gap-1"
                        disabled={busy === r.id}
                        onClick={() => toggle(r, true)}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {ar ? "تفعيل (شهر)" : "Mark paid (1mo)"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === r.id}
                      onClick={() => toggleVerify(r)}
                      className="gap-1"
                    >
                      <BadgeCheck className="h-4 w-4" />
                      {r.is_verified ? (ar ? "إلغاء توثيق" : "Unverify") : ar ? "توثيق" : "Verify"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
