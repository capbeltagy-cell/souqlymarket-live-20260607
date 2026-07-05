import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Package, ShoppingBag, Truck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { listMyOrders } from "@/lib/orders.functions";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "طلباتي — Souqly" }] }),
  component: OrdersPage,
});

type Order = {
  id: string; status: string; payment_status?: string; total_amount?: number | null;
  currency?: string; quantity: number; created_at: string; tracking_number?: string | null;
  product_listing_id?: string | null; listing_id?: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  awaiting_seller: "bg-warning/20 text-warning",
  accepted: "bg-primary/20 text-primary",
  packed: "bg-primary/20 text-primary",
  shipped: "bg-blue-500/20 text-blue-500",
  delivered: "bg-success/20 text-success",
  completed: "bg-success/20 text-success",
  cancelled: "bg-destructive/20 text-destructive",
  rejected: "bg-destructive/20 text-destructive",
  returned: "bg-orange-500/20 text-orange-500",
};

const STATUS_AR: Record<string, string> = {
  draft: "مسودة", awaiting_seller: "بانتظار البائع", accepted: "مقبول", rejected: "مرفوض",
  packed: "مُجهّز", shipped: "تم الشحن", delivered: "تم التسليم", completed: "مكتمل",
  cancelled: "ملغي", returned: "مُرتجع", new: "جديد", fulfilled: "منفذ",
};

function OrdersPage() {
  const fetchOrders = useServerFn(listMyOrders);
  const [buyer, setBuyer] = useState<Order[]>([]);
  const [seller, setSeller] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders().then((r) => {
      setBuyer(r.asBuyer as Order[]);
      setSeller(r.asSeller as Order[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [fetchOrders]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-8 flex-1">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><ShoppingBag className="h-6 w-6" />طلباتي</h1>
        <Tabs defaultValue="buyer">
          <TabsList>
            <TabsTrigger value="buyer">مشترياتي ({buyer.length})</TabsTrigger>
            <TabsTrigger value="seller">مبيعاتي ({seller.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="buyer" className="mt-4">
            {loading ? <div className="text-sm text-muted-foreground">جارٍ التحميل…</div>
              : buyer.length === 0 ? <EmptyState icon={Package} title="لا توجد طلبات" description="ابدأ التسوق من السوق الآن" />
              : <OrderList orders={buyer} />}
          </TabsContent>
          <TabsContent value="seller" className="mt-4">
            {loading ? <div className="text-sm text-muted-foreground">جارٍ التحميل…</div>
              : seller.length === 0 ? <EmptyState icon={Truck} title="لا توجد مبيعات بعد" description="أضف منتجاتك وابدأ البيع" />
              : <OrderList orders={seller} />}
          </TabsContent>
        </Tabs>
      </section>
      <SiteFooter />
    </div>
  );
}

function OrderList({ orders }: { orders: Order[] }) {
  return (
    <div className="grid gap-3">
      {orders.map((o) => (
        <Link key={o.id} to="/orders/$id" params={{ id: o.id }} className="block rounded-lg border border-border bg-card p-4 hover:border-primary transition">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold">#{o.id.slice(0, 8)}</div>
              <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("ar-EG")}</div>
            </div>
            <Badge className={STATUS_BADGE[o.status] ?? ""}>{STATUS_AR[o.status] ?? o.status}</Badge>
            <div className="text-sm font-semibold">
              {o.total_amount ? `${Number(o.total_amount).toLocaleString("ar-EG")} ${o.currency ?? "EGP"}` : "—"}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
