import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AlertTriangle, BarChart3, Loader2, Package, ShoppingBag, Store, WalletCards } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/currency";
import { getStoreAnalytics } from "@/lib/store-analytics.functions";

export const Route = createFileRoute("/_authenticated/store-analytics")({
  head: () => ({ meta: [{ title: "إحصائيات المتجر — سوقلي" }] }),
  component: StoreAnalyticsPage,
});

function StoreAnalyticsPage() {
  const load = useServerFn(getStoreAnalytics);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load().then(setData).catch((e) => setError((e as Error).message));
  }, [load]);

  if (error) return <Shell><div className="py-24 text-center text-destructive">{error}</div></Shell>;
  if (!data) return <Shell><div className="py-24 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div></Shell>;

  const t = data.totals;
  return (
    <Shell>
      <main className="container-souqly py-8 flex-1 space-y-7" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6" /> لوحة مبيعات المتجر</h1>
            <p className="text-sm text-muted-foreground mt-1">بيانات حقيقية من طلبات ومنتجات {data.store.name_ar}.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/store-catalog">إدارة الكتالوج</Link></Button>
            <Button asChild><Link to="/orders">إدارة الطلبات</Link></Button>
          </div>
        </div>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={<ShoppingBag />} label="إجمالي الطلبات" value={t.orders} />
          <Stat icon={<WalletCards />} label="الإيرادات المحصلة" value={formatPrice(t.grossRevenue, "ar")} />
          <Stat icon={<WalletCards />} label="إيرادات معلقة" value={formatPrice(t.pendingRevenue, "ar")} />
          <Stat icon={<Package />} label="المنتجات النشطة" value={`${t.activeProducts}/${t.products}`} />
        </section>

        <section className="grid lg:grid-cols-[1.2fr,.8fr] gap-5">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-bold text-lg mb-4">حالات الطلبات</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(data.statusCounts).map(([status, value]) => (
                <div key={status} className="rounded-lg bg-muted/50 p-3">
                  <div className="text-2xl font-bold">{String(value)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{statusLabel(status)}</div>
                </div>
              ))}
              {Object.keys(data.statusCounts).length === 0 && <p className="text-sm text-muted-foreground">لا توجد طلبات حتى الآن.</p>}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> تنبيهات المخزون</h2>
            <div className="space-y-3">
              {data.lowStock.map((item: any) => (
                <Link key={item.id} to="/listings/$id" params={{ id: item.id }} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/40">
                  <span className="text-sm font-medium line-clamp-1">{item.title}</span>
                  <span className={item.stock_quantity === 0 ? "text-destructive font-bold" : "text-amber-600 font-bold"}>{item.stock_quantity}</span>
                </Link>
              ))}
              {data.lowStock.length === 0 && <p className="text-sm text-muted-foreground">المخزون بحالة جيدة.</p>}
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-bold text-lg mb-4">المنتجات الأكثر بيعًا</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.topProducts.map((item: any, index: number) => (
              <Link key={item.listing_id} to="/listings/$id" params={{ id: item.listing_id }} className="rounded-lg border overflow-hidden hover:shadow-sm transition">
                <div className="aspect-video bg-muted">{item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}</div>
                <div className="p-3">
                  <div className="text-xs text-muted-foreground">#{index + 1}</div>
                  <div className="font-semibold line-clamp-1 mt-1">{item.title}</div>
                  <div className="text-xs text-muted-foreground mt-2">{item.quantity} قطعة • {item.orders} طلب</div>
                  <div className="font-bold text-primary mt-1">{formatPrice(item.revenue, "ar")}</div>
                </div>
              </Link>
            ))}
            {data.topProducts.length === 0 && <p className="text-sm text-muted-foreground">ستظهر المنتجات هنا بعد وصول أول طلب.</p>}
          </div>
        </section>

        <section className="rounded-xl border bg-card overflow-hidden">
          <div className="p-5 border-b"><h2 className="font-bold text-lg">آخر الطلبات</h2></div>
          <div className="divide-y">
            {data.recentOrders.map((order: any) => (
              <Link key={order.id} to="/orders/$id" params={{ id: order.id }} className="grid grid-cols-[1fr,auto] sm:grid-cols-[1fr,120px,120px,130px] gap-3 items-center p-4 hover:bg-muted/40">
                <div><div className="font-medium line-clamp-1">{order.title}</div><div className="text-xs text-muted-foreground mt-1">{new Date(order.created_at).toLocaleString("ar-EG")}</div></div>
                <div className="text-sm hidden sm:block">{order.quantity} قطعة</div>
                <div className="text-sm hidden sm:block">{statusLabel(order.status)}</div>
                <div className="font-bold text-primary">{formatPrice(order.total_amount, "ar")}</div>
              </Link>
            ))}
            {data.recentOrders.length === 0 && <div className="p-10 text-center text-muted-foreground">لا توجد طلبات حتى الآن.</div>}
          </div>
        </section>
      </main>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex flex-col bg-muted/20"><SiteHeader />{children}<SiteFooter /></div>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return <div className="rounded-xl border bg-card p-4"><div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center">{icon}</div><div className="text-2xl font-bold mt-3">{value}</div><div className="text-xs text-muted-foreground mt-1">{label}</div></div>;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = { awaiting_seller: "بانتظار البائع", accepted: "مقبول", rejected: "مرفوض", packed: "تم التجهيز", shipped: "تم الشحن", delivered: "تم التوصيل", completed: "مكتمل", cancelled: "ملغي", returned: "مرتجع", draft: "مسودة" };
  return labels[status] ?? status;
}
