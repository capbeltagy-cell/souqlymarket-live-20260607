import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, PauseCircle, Search, ShieldCheck, Star, Store, XCircle } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { listAdminStores, moderateStore } from "@/lib/stores.functions";

export const Route = createFileRoute("/_authenticated/admin-stores")({ component: AdminStoresPage });

type StoreRow = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  logo_url: string | null;
  city: string | null;
  governorate: string | null;
  status: "draft" | "pending_review" | "published" | "suspended";
  verified: boolean;
  featured: boolean;
  created_at: string;
};

function AdminStoresPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const [rows, setRows] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  async function reload() {
    setLoading(true);
    try { setRows((await listAdminStores()) as StoreRow[]); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (isAdmin) reload(); else setLoading(false); }, [isAdmin]);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = query.trim().toLowerCase();
    const matchesText = !q || [row.name_ar, row.name_en, row.slug, row.city, row.governorate].some((v) => v?.toLowerCase().includes(q));
    return matchesText && (status === "all" || row.status === status);
  }), [rows, query, status]);

  async function update(row: StoreRow, patch: Partial<Pick<StoreRow, "status" | "verified" | "featured">>) {
    setBusy(row.id);
    try {
      await moderateStore({ data: { id: row.id, status: patch.status ?? row.status, verified: patch.verified, featured: patch.featured } });
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, ...patch } : item));
      toast.success("تم تحديث المتجر");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }

  if (!isAdmin) return <div className="min-h-screen flex flex-col"><SiteHeader /><main className="container-souqly py-16 flex-1 text-center text-muted-foreground">هذه الصفحة للمسؤولين فقط</main><SiteFooter /></div>;

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <main className="container-souqly py-8 flex-1 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-primary font-semibold">إدارة سوقلي</p>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Store className="h-7 w-7" /> إدارة المتاجر</h1>
            <p className="text-muted-foreground mt-1">راجع المتاجر واعتمدها أو أوقفها وتحكم في التوثيق والتمييز.</p>
          </div>
          <Button asChild variant="outline"><Link to="/admin-overview">العودة للوحة الإدارة</Link></Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="كل المتاجر" value={rows.length} />
          <Stat label="قيد المراجعة" value={rows.filter((r) => r.status === "pending_review").length} />
          <Stat label="منشورة" value={rows.filter((r) => r.status === "published").length} />
          <Stat label="موقوفة" value={rows.filter((r) => r.status === "suspended").length} />
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1"><Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="ps-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث باسم المتجر أو الرابط أو المدينة" /></div>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">كل الحالات</option><option value="pending_review">قيد المراجعة</option><option value="published">منشور</option><option value="suspended">موقوف</option><option value="draft">مسودة</option>
          </select>
        </div>

        {loading ? <div className="py-16 text-center text-muted-foreground">جارٍ تحميل المتاجر…</div> : (
          <div className="space-y-3">
            {filtered.map((row) => (
              <article key={row.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="h-16 w-16 rounded-xl border bg-muted overflow-hidden grid place-items-center shrink-0">{row.logo_url ? <img src={row.logo_url} alt="" className="h-full w-full object-cover" /> : <Store className="h-7 w-7 text-muted-foreground" />}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-lg">{row.name_ar}</h2><Badge status={row.status} />{row.verified && <span className="text-xs text-primary flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> موثق</span>}{row.featured && <span className="text-xs text-amber-600 flex items-center gap-1"><Star className="h-3.5 w-3.5" /> مميز</span>}</div>
                    <div className="text-sm text-muted-foreground mt-1">/stores/{row.slug} {row.city || row.governorate ? `• ${[row.city,row.governorate].filter(Boolean).join("، ")}` : ""}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline"><Link to="/stores/$slug" params={{ slug: row.slug }}><Eye className="h-4 w-4 me-1" /> معاينة</Link></Button>
                    {row.status !== "published" && <Button size="sm" disabled={busy === row.id} onClick={() => update(row, { status: "published" })}><CheckCircle2 className="h-4 w-4 me-1" /> اعتماد</Button>}
                    {row.status !== "suspended" && <Button size="sm" variant="destructive" disabled={busy === row.id} onClick={() => update(row, { status: "suspended" })}><PauseCircle className="h-4 w-4 me-1" /> إيقاف</Button>}
                    {row.status === "published" && <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => update(row, { status: "pending_review" })}><XCircle className="h-4 w-4 me-1" /> سحب النشر</Button>}
                    <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => update(row, { verified: !row.verified })}><ShieldCheck className="h-4 w-4 me-1" /> {row.verified ? "إلغاء التوثيق" : "توثيق"}</Button>
                    <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => update(row, { featured: !row.featured })}><Star className="h-4 w-4 me-1" /> {row.featured ? "إلغاء التمييز" : "تمييز"}</Button>
                  </div>
                </div>
              </article>
            ))}
            {filtered.length === 0 && <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">لا توجد متاجر مطابقة.</div>}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-border bg-card p-4 text-center"><div className="text-2xl font-bold text-primary">{value}</div><div className="text-xs text-muted-foreground mt-1">{label}</div></div>; }
function Badge({ status }: { status: StoreRow["status"] }) { const map = { draft: "مسودة", pending_review: "قيد المراجعة", published: "منشور", suspended: "موقوف" }; return <span className="rounded-full bg-muted px-2.5 py-1 text-xs">{map[status]}</span>; }
