import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Package, ShoppingBag, Truck, Search } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listMyOrders } from "@/lib/orders.functions";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "طلباتي — Souqly" }] }),
  component: OrdersPage,
});

type Order = {
  id: string;
  status: string;
  payment_status?: string;
  total_amount?: number | null;
  currency?: string;
  quantity: number;
  created_at: string;
  tracking_number?: string | null;
  product_listing_id?: string | null;
  listing_id?: string | null;
  referral_code?: string | null;
  _listing?: {
    id: string;
    title_ar?: string | null;
    title_en?: string | null;
    images?: string[] | null;
  } | null;
  _company?: {
    id: string;
    name_ar?: string | null;
    name_en?: string | null;
    logo_url?: string | null;
  } | null;
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
  draft: "مسودة",
  awaiting_seller: "بانتظار البائع",
  accepted: "مقبول",
  rejected: "مرفوض",
  packed: "مُجهّز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  completed: "مكتمل",
  cancelled: "ملغي",
  returned: "مُرتجع",
};

const FILTERS: Array<{ key: string; label: string; match: (s: string) => boolean }> = [
  { key: "all", label: "الكل", match: () => true },
  { key: "pending", label: "قيد الانتظار", match: (s) => s === "awaiting_seller" || s === "draft" },
  { key: "accepted", label: "مقبول", match: (s) => s === "accepted" },
  { key: "packed", label: "قيد التجهيز", match: (s) => s === "packed" },
  { key: "shipped", label: "تم الشحن", match: (s) => s === "shipped" },
  { key: "delivered", label: "تم التسليم", match: (s) => s === "delivered" || s === "completed" },
  {
    key: "cancelled",
    label: "ملغي/مرفوض",
    match: (s) => s === "cancelled" || s === "rejected" || s === "returned",
  },
];

function OrdersPage() {
  const fetchOrders = useServerFn(listMyOrders);
  const [buyer, setBuyer] = useState<Order[]>([]);
  const [seller, setSeller] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchOrders()
      .then((r) => {
        setBuyer(r.asBuyer as Order[]);
        setSeller(r.asSeller as Order[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [fetchOrders]);

  const applyFilters = (orders: Order[]) => {
    const f = FILTERS.find((x) => x.key === filter) ?? FILTERS[0];
    const ql = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (!f.match(o.status)) return false;
      if (!ql) return true;
      const hay =
        `${o.id} ${o._listing?.title_ar ?? ""} ${o._listing?.title_en ?? ""} ${o._company?.name_ar ?? ""} ${o._company?.name_en ?? ""}`.toLowerCase();
      return hay.includes(ql);
    });
  };

  const filteredBuyer = useMemo(() => applyFilters(buyer), [buyer, q, filter]);
  const filteredSeller = useMemo(() => applyFilters(seller), [seller, q, filter]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-6 sm:py-8 flex-1">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <ShoppingBag className="h-6 w-6" />
          طلباتي
        </h1>

        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث برقم الطلب أو المنتج أو الشركة"
              className="ps-9"
              dir="rtl"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            {FILTERS.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? "default" : "outline"}
                onClick={() => setFilter(f.key)}
                className="shrink-0"
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="buyer">
          <TabsList>
            <TabsTrigger value="buyer">مشترياتي ({filteredBuyer.length})</TabsTrigger>
            <TabsTrigger value="seller">مبيعاتي ({filteredSeller.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="buyer" className="mt-4">
            {loading ? (
              <div className="text-sm text-muted-foreground">جارٍ التحميل…</div>
            ) : filteredBuyer.length === 0 ? (
              <EmptyState
                icon={<Package className="h-7 w-7" />}
                title="لا توجد طلبات"
                description="لا توجد نتائج مطابقة"
              />
            ) : (
              <OrderList orders={filteredBuyer} />
            )}
          </TabsContent>
          <TabsContent value="seller" className="mt-4">
            {loading ? (
              <div className="text-sm text-muted-foreground">جارٍ التحميل…</div>
            ) : filteredSeller.length === 0 ? (
              <EmptyState
                icon={<Truck className="h-7 w-7" />}
                title="لا توجد مبيعات"
                description="لا توجد نتائج مطابقة"
              />
            ) : (
              <OrderList orders={filteredSeller} />
            )}
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
      {orders.map((o) => {
        const title = o._listing?.title_ar ?? o._listing?.title_en ?? `#${o.id.slice(0, 8)}`;
        const company = o._company?.name_ar ?? o._company?.name_en ?? "";
        const img = o._listing?.images?.[0];
        return (
          <Link
            key={o.id}
            to="/orders/$id"
            params={{ id: o.id }}
            className="block rounded-lg border border-border bg-card p-3 sm:p-4 hover:border-primary transition"
          >
            <div className="flex items-start gap-3">
              {img && (
                <img
                  src={img}
                  alt=""
                  className="h-14 w-14 sm:h-16 sm:w-16 rounded object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{title}</div>
                    {company && (
                      <div className="text-xs text-muted-foreground truncate">{company}</div>
                    )}
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      #{o.id.slice(0, 8)} • {new Date(o.created_at).toLocaleString("ar-EG")}
                    </div>
                  </div>
                  <div className="text-end shrink-0">
                    <Badge className={STATUS_BADGE[o.status] ?? ""}>
                      {STATUS_AR[o.status] ?? o.status}
                    </Badge>
                    <div className="text-sm font-bold mt-1">
                      {o.total_amount
                        ? `${Number(o.total_amount).toLocaleString("ar-EG")} ${o.currency ?? "EGP"}`
                        : "—"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {o.payment_status === "paid" && (
                    <Badge variant="secondary" className="text-[10px]">
                      مدفوع
                    </Badge>
                  )}
                  {o.payment_status === "pending_review" && (
                    <Badge variant="secondary" className="text-[10px]">
                      مراجعة الدفع
                    </Badge>
                  )}
                  {o.tracking_number && (
                    <Badge variant="secondary" className="text-[10px]">
                      شحنة: {o.tracking_number}
                    </Badge>
                  )}
                  {o.referral_code && (
                    <Badge variant="secondary" className="text-[10px]">
                      إحالة
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
