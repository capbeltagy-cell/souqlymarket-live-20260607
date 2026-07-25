import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldAlert,
  Loader2,
  Crown,
  BadgeCheck,
  Star,
  Trash2,
  Ban,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AdminLayout } from "@/components/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { superCheck, superOverview, superList, superAction } from "@/lib/super-admin.functions";
import { requireAdminRoute } from "@/lib/route-guards";
import { toast } from "sonner";

const ENTITY_LABELS: Record<string, string> = {
  companies: "الشركات",
  users: "المستخدمون",
  agents: "المسوقون",
  listings: "الإعلانات والمنتجات",
  leads: "العملاء المحتملون",
  rfqs: "طلبات عروض الأسعار",
  wholesale_listings: "تجارة الجملة",
  factories: "المصانع",
  tenders: "المناقصات",
  subscriptions: "الاشتراكات",
  company_referrals: "إحالات الشركات",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "قيد المراجعة",
  pending_review: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
  active: "نشط",
  suspended: "موقوف",
  published: "منشور",
  draft: "مسودة",
  completed: "مكتمل",
  failed: "فشل",
};
const ENTITIES = [
  "companies",
  "users",
  "agents",
  "listings",
  "leads",
  "rfqs",
  "wholesale_listings",
  "factories",
  "tenders",
  "subscriptions",
  "company_referrals",
] as const;
type Entity = (typeof ENTITIES)[number];
type AdminAction =
  | "verify_company"
  | "unverify_company"
  | "mark_paid"
  | "mark_unpaid"
  | "feature_listing"
  | "unfeature_listing"
  | "approve_listing"
  | "reject_listing"
  | "hide_listing"
  | "delete"
  | "ban_user"
  | "unban_user";
type AdminRow = {
  id: string;
  [key: string]: unknown;
};

function readText(row: AdminRow, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

function readBoolean(row: AdminRow, key: string) {
  return row[key] === true;
}

export const Route = createFileRoute("/control-center-x7")({
  ssr: false,
  beforeLoad: requireAdminRoute,
  head: () => ({
    meta: [{ title: "مركز التحكم — سوقلي" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: ControlCenter,
});

function ControlCenter() {
  const { user, roles, loading } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof superOverview>> | null>(null);
  const check = useServerFn(superCheck);
  const ov = useServerFn(superOverview);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setAuthorized(false);
      return;
    }
    if (!roles.includes("super_admin")) {
      setAuthorized(false);
      return;
    }
    check()
      .then(() => {
        setAuthorized(true);
        ov()
          .then(setOverview)
          .catch(() => {});
      })
      .catch(() => setAuthorized(false));
  }, [check, loading, ov, roles, user]);

  if (loading || authorized === null) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6">
        <div className="text-center max-w-sm">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-3" />
          <h1 className="text-2xl font-bold">الوصول غير مسموح</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {user ? "لا تملك صلاحية فتح هذه الصفحة." : "سجّل الدخول بحساب إداري مصرح له."}
          </p>
          {!user && (
            <Button
              className="mt-4"
              onClick={() => {
                window.location.href = "/auth";
              }}
            >
              تسجيل الدخول
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <AdminLayout
      title="مركز التحكم المتقدم"
      description={`منطقة عمليات مقيّدة — ${user?.email ?? "حساب إداري"}`}
      breadcrumbs={[{ label: "مركز التحكم" }]}
    >
      <div className="space-y-6">
        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Stat label="الشركات" value={overview.counts.companies} />
            <Stat label="الاشتراكات المدفوعة" value={overview.paidCompanies} />
            <Stat label="الشركات الموثقة" value={overview.verifiedCompanies} />
            <Stat label="المسوقون" value={overview.counts.agents} />
            <Stat label="الإعلانات" value={overview.counts.listings} />
            <Stat label="الإعلانات المميزة" value={overview.featuredListings} />
            <Stat label="العملاء المحتملون" value={overview.counts.leads} />
            <Stat label="طلبات عروض الأسعار" value={overview.counts.rfqs} />
            <Stat label="تجارة الجملة" value={overview.counts.wholesale_listings} />
            <Stat label="المصانع" value={overview.counts.factories} />
            <Stat label="المناقصات" value={overview.counts.tenders} />
            <Stat label="المستخدمون" value={overview.counts.profiles} />
          </div>
        )}

        <Tabs defaultValue="companies">
          <TabsList className="flex-wrap h-auto">
            {ENTITIES.map((e) => (
              <TabsTrigger key={e} value={e}>
                {ENTITY_LABELS[e] ?? e}
              </TabsTrigger>
            ))}
          </TabsList>
          {ENTITIES.map((e) => (
            <TabsContent key={e} value={e}>
              <EntityPanel entity={e} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-[10px] uppercase text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function EntityPanel({ entity }: { entity: Entity }) {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [busy, setBusy] = useState(false);
  const list = useServerFn(superList);
  const act = useServerFn(superAction);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const result = await list({ data: { entity, limit: 100 } });
      setRows(
        (result as unknown[]).filter(
          (row): row is AdminRow =>
            typeof row === "object" &&
            row !== null &&
            "id" in row &&
            typeof (row as { id?: unknown }).id === "string",
        ),
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [entity, list]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (action: AdminAction, id: string, payload?: Record<string, unknown>) => {
    try {
      await act({ data: { action, entity, id, payload } });
      toast.success("تم تنفيذ الإجراء");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (busy)
    return (
      <div className="py-8 text-center">
        <Loader2 className="h-5 w-5 animate-spin inline" />
      </div>
    );
  if (!rows.length)
    return <div className="py-8 text-center text-muted-foreground">لا توجد بيانات</div>;

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">عدد السجلات: {rows.length}</div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <tbody>
            {rows.slice(0, 50).map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="p-3 align-top">
                  <div className="font-medium truncate max-w-md">
                    {readText(r, "title_ar") ||
                      readText(r, "title_en") ||
                      readText(r, "title") ||
                      readText(r, "name_ar") ||
                      readText(r, "name_en") ||
                      readText(r, "name") ||
                      readText(r, "email") ||
                      readText(r, "subject") ||
                      r.id}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate max-w-md">
                    {r.id}
                  </div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {readBoolean(r, "is_verified") && (
                      <Badge variant="outline" className="text-[10px]">
                        موثّق
                      </Badge>
                    )}
                    {readBoolean(r, "featured") && (
                      <Badge variant="outline" className="text-[10px]">
                        مميّز
                      </Badge>
                    )}
                    {r.subscription_plan === "premium_company" && (
                      <Badge variant="outline" className="text-[10px]">
                        مدفوع
                      </Badge>
                    )}
                    {readText(r, "status") && (
                      <Badge variant="outline" className="text-[10px]">
                        {STATUS_LABELS[readText(r, "status")] ?? readText(r, "status")}
                      </Badge>
                    )}
                    {readText(r, "banned_until") && (
                      <Badge variant="destructive" className="text-[10px]">
                        محظور
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="p-3 text-right">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {entity === "companies" && (
                      <>
                        <Button
                          aria-label={
                            readBoolean(r, "is_verified") ? "إلغاء توثيق الشركة" : "توثيق الشركة"
                          }
                          title={
                            readBoolean(r, "is_verified") ? "إلغاء توثيق الشركة" : "توثيق الشركة"
                          }
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            run(
                              readBoolean(r, "is_verified") ? "unverify_company" : "verify_company",
                              r.id,
                            )
                          }
                        >
                          <BadgeCheck className="h-3 w-3" />
                        </Button>
                        <Button
                          aria-label={
                            r.subscription_plan === "premium_company"
                              ? "إلغاء الاشتراك"
                              : "تفعيل الاشتراك"
                          }
                          title={
                            r.subscription_plan === "premium_company"
                              ? "إلغاء الاشتراك"
                              : "تفعيل الاشتراك"
                          }
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            run(
                              r.subscription_plan === "premium_company"
                                ? "mark_unpaid"
                                : "mark_paid",
                              r.id,
                            )
                          }
                        >
                          <Crown className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    {entity === "listings" && (
                      <>
                        <Button
                          aria-label="اعتماد الإعلان"
                          title="اعتماد الإعلان"
                          size="sm"
                          variant="outline"
                          onClick={() => run("approve_listing", r.id)}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                        </Button>
                        <Button
                          aria-label="رفض الإعلان"
                          title="رفض الإعلان"
                          size="sm"
                          variant="outline"
                          onClick={() => run("reject_listing", r.id)}
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                        <Button
                          aria-label={
                            readBoolean(r, "featured") ? "إلغاء تمييز الإعلان" : "تمييز الإعلان"
                          }
                          title={
                            readBoolean(r, "featured") ? "إلغاء تمييز الإعلان" : "تمييز الإعلان"
                          }
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            run(
                              readBoolean(r, "featured") ? "unfeature_listing" : "feature_listing",
                              r.id,
                              { days: 7 },
                            )
                          }
                        >
                          <Star className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    {entity === "users" && (
                      <Button
                        aria-label={
                          readText(r, "banned_until") ? "إلغاء حظر المستخدم" : "حظر المستخدم"
                        }
                        title={readText(r, "banned_until") ? "إلغاء حظر المستخدم" : "حظر المستخدم"}
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          run(readText(r, "banned_until") ? "unban_user" : "ban_user", r.id)
                        }
                      >
                        <Ban className="h-3 w-3" />
                      </Button>
                    )}
                    {entity !== "users" && (
                      <Button
                        aria-label="حذف السجل"
                        title="حذف السجل"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm("هل تريد حذف هذا السجل؟")) run("delete", r.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
