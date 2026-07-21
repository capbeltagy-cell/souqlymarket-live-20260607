import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, UserRoundCheck, UserRoundX } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminListUsers, adminSetUserSuspended } from "@/lib/admin-core.functions";
import { requireAdminRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin-users")({
  beforeLoad: requireAdminRoute,
  head: () => ({ meta: [{ title: "إدارة المستخدمين — سوقلي" }] }),
  component: AdminUsersPage,
});

type UserRow = Awaited<ReturnType<typeof adminListUsers>>["users"][number];

function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await adminListUsers({
        data: { page, pageSize: 20, search, status: status === "all" ? undefined : status },
      });
      setUsers(result.users);
      setTotal(result.total);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل المستخدمين");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [page, search, status]);

  async function toggleSuspended(user: UserRow) {
    setBusy(user.id);
    try {
      await adminSetUserSuspended({
        data: { userId: user.id, suspended: user.status === "active" },
      });
      toast.success(user.status === "active" ? "تم إيقاف المستخدم" : "تمت إعادة تفعيل المستخدم");
      await load();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "تعذر تحديث المستخدم");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminLayout
      title="إدارة المستخدمين"
      description="بحث ومراجعة وإدارة حالة حسابات المنصة ببيانات حقيقية."
      breadcrumbs={[{ label: "المستخدمون" }]}
      loading={loading && users.length === 0}
      error={error}
    >
      <div className="space-y-5">
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_180px]">
          <label className="relative">
            <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="pe-10"
              placeholder="ابحث بالاسم أو البريد أو الهاتف"
            />
          </label>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as typeof status);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-input bg-surface px-3 text-sm"
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="suspended">موقوف</option>
          </select>
        </div>

        {!loading && users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
            لا توجد نتائج مطابقة.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/60">
                <tr>
                  {[
                    "المستخدم",
                    "الهاتف",
                    "الأدوار",
                    "الحالة",
                    "الشركات",
                    "المتاجر",
                    "آخر دخول",
                    "الإجراء",
                  ].map((label) => (
                    <th key={label} className="px-4 py-3 text-start font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium">{user.name || "بدون اسم"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-56 flex-wrap gap-1">
                        {user.roles.length ? (
                          user.roles.map((role) => (
                            <Badge key={role} variant="outline">
                              {role}
                            </Badge>
                          ))
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.status === "active" ? "default" : "destructive"}>
                        {user.status === "active" ? "نشط" : "موقوف"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{user.companiesCount}</td>
                    <td className="px-4 py-3">{user.storesCount}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {user.lastSignInAt
                        ? new Date(user.lastSignInAt).toLocaleString("ar-EG")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant={user.status === "active" ? "destructive" : "outline"}
                        disabled={busy === user.id}
                        onClick={() => void toggleSuspended(user)}
                      >
                        {user.status === "active" ? (
                          <UserRoundX className="me-1 h-4 w-4" />
                        ) : (
                          <UserRoundCheck className="me-1 h-4 w-4" />
                        )}
                        {user.status === "active" ? "إيقاف" : "إعادة التفعيل"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">إجمالي الحسابات: {total}</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page === 1 || loading}
              onClick={() => setPage((value) => value - 1)}
            >
              السابق
            </Button>
            <Badge variant="outline" className="px-4">
              صفحة {page}
            </Badge>
            <Button
              variant="outline"
              disabled={page * 20 >= total || loading}
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
