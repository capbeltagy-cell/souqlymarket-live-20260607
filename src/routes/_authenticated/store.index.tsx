import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { getMyStore, getStoreAnalytics, listStoreOrders, submitStoreForReview } from "@/lib/stores.functions";
import { Store as StoreIcon, Package, ShoppingBag, Ticket, BarChart3, Settings, ExternalLink } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/store/")({
  head: () => ({ meta: [{ title: "متجري — سوقلي" }] }),
  component: StoreDashboard,
});

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "مسودة", cls: "bg-muted text-muted-foreground" },
    pending_review: { label: "قيد المراجعة", cls: "bg-warning/20 text-warning-foreground" },
    published: { label: "منشور", cls: "bg-success/20 text-success-foreground" },
    suspended: { label: "موقوف", cls: "bg-destructive/20 text-destructive" },
    rejected: { label: "مرفوض", cls: "bg-destructive/20 text-destructive" },
  };
  const s = map[status] ?? { label: status, cls: "" };
  return <span className={`px-2 py-1 rounded-full text-xs ${s.cls}`}>{s.label}</span>;
}

function StoreDashboard() {
  const navigate = useNavigate();
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    getMyStore().then(async (r) => {
      setStore(r.store);
      if (r.store?.id) {
        const [a, o] = await Promise.all([
          getStoreAnalytics({ data: { store_id: r.store.id } }).catch(() => null),
          listStoreOrders({ data: { store_id: r.store.id } }).catch(() => ({ items: [] })),
        ]);
        setAnalytics(a);
        setOrders(o.items.slice(0, 8));
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="min-h-screen"><SiteHeader /><div className="container-souqly py-12 text-center text-muted-foreground">…</div></div>;

  if (!store) {
    return (
      <div className="min-h-screen bg-surface-2">
        <SiteHeader />
        <div className="container-souqly py-12 max-w-2xl text-center">
          <StoreIcon className="h-16 w-16 mx-auto text-primary mb-4" />
          <h1 className="text-2xl font-bold mb-2">لا يوجد لديك متجر بعد</h1>
          <p className="text-muted-foreground mb-6">افتح متجرك الآن واستقبل الطلبات من داخل سوقلي.</p>
          <Button onClick={() => navigate({ to: "/store/open" })}>افتح متجرك</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-6 space-y-6">
        <div className="rounded-xl bg-card border border-border p-5 flex flex-wrap items-center gap-4">
          <div className="h-14 w-14 rounded-full overflow-hidden bg-muted grid place-items-center">
            {store.logo_url ? <img src={store.logo_url} className="h-full w-full object-cover" alt="" /> : <StoreIcon />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{store.name_ar}</h1>
              {statusBadge(store.status)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">/stores/{store.slug}</div>
            {store.rejection_reason && store.status === "rejected" && (
              <div className="text-xs text-destructive mt-1">سبب الرفض: {store.rejection_reason}</div>
            )}
          </div>
          <div className="flex gap-2">
            {store.status === "published" && (
              <Button variant="outline" asChild><a href={`/stores/${store.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 me-1" />معاينة</a></Button>
            )}
            {(store.status === "draft" || store.status === "rejected") && (
              <Button onClick={async () => {
                try { await submitStoreForReview({ data: { id: store.id } }); toast.success("تم الإرسال للمراجعة"); location.reload(); }
                catch (e: any) { toast.error(e.message); }
              }}>إرسال للمراجعة</Button>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi icon={<Package />} label="المنتجات" value={analytics?.totals?.products ?? 0} />
          <Kpi icon={<ShoppingBag />} label="الطلبات" value={analytics?.totals?.orders ?? 0} />
          <Kpi icon={<BarChart3 />} label="المدفوع" value={analytics?.totals?.paidOrders ?? 0} />
          <Kpi icon={<BarChart3 />} label="المبيعات" value={formatPrice(analytics?.totals?.totalSales ?? 0, "ar", { showZero: true })} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NavCard to="/listings/new" icon={<Package />} label="إضافة منتج" />
          <NavCard to="/store/coupons" icon={<Ticket />} label="الكوبونات" />
          <NavCard to="/orders" icon={<ShoppingBag />} label="الطلبات" />
          <NavCard to="/store/open" icon={<Settings />} label="إعدادات المتجر" />
        </div>

        <div className="rounded-xl bg-card border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">آخر الطلبات</h2>
            <Link to="/orders" className="text-sm text-primary">عرض الكل</Link>
          </div>
          {orders.length === 0 ? (
            <div className="text-muted-foreground text-sm py-4">لا توجد طلبات بعد</div>
          ) : (
            <div className="divide-y">
              {orders.map((o) => (
                <Link key={o.id} to="/orders/$id" params={{ id: o.id }} className="py-3 flex items-center justify-between text-sm hover:bg-muted/30 px-2 rounded">
                  <div>#{o.id.slice(0, 8)} — {o.status}</div>
                  <div className="font-semibold">{formatPrice(o.total_amount, "ar", { showZero: true })}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-xl bg-card border border-border p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center">{icon}</div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-bold">{value}</div>
      </div>
    </div>
  );
}

function NavCard({ to, icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to as any} className="rounded-xl bg-card border border-border p-4 flex items-center gap-3 hover:shadow-md transition">
      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center">{icon}</div>
      <div className="font-medium">{label}</div>
    </Link>
  );
}
