import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Package, ShoppingBag, ArrowRight, CreditCard } from "lucide-react";
import { z } from "zod";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nProvider";
import { getOrder } from "@/lib/orders.functions";

const searchSchema = z.object({ ids: z.string().optional() });

export const Route = createFileRoute("/_authenticated/orders/$id/confirmation")({
  validateSearch: (s: Record<string, unknown>) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "تم استلام الطلب — Souqly" }] }),
  component: OrderConfirmationPage,
});

function OrderConfirmationPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { id } = Route.useParams();
  const { ids } = Route.useSearch();
  const load = useServerFn(getOrder);
  const [orders, setOrders] = useState<Array<{ order: any; listing: any }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const list = ids?.split(",").filter(Boolean) ?? [id];
    Promise.all(list.map((oid) => load({ data: { id: oid } }).catch(() => null)))
      .then((res) => {
        setOrders(res.filter(Boolean) as Array<{ order: any; listing: any }>);
      })
      .finally(() => setLoading(false));
  }, [id, ids, load]);

  const total = orders.reduce((s, o) => s + Number(o.order?.total_amount ?? 0), 0);
  const currency = orders[0]?.order?.currency ?? "EGP";

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1 max-w-2xl mx-auto w-full">
        {/* Success banner */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 rounded-full bg-success/10 grid place-items-center mb-4">
            <CheckCircle2 className="h-9 w-9 text-success" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {ar ? "تم استلام طلبك بنجاح!" : "Your order has been placed!"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {ar
              ? `أرسلنا تنبيهًا للبائع${orders.length > 1 ? "ين" : ""} وسنُعلمك فور القبول.`
              : `We notified the seller${orders.length > 1 ? "s" : ""} — you'll be alerted when they respond.`}
          </p>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-8">{ar ? "جارٍ التحميل…" : "Loading…"}</div>
        ) : (
          <>
            {/* Orders list */}
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {orders.map(({ order, listing }) => (
                <div key={order.id} className="p-4 flex items-center gap-4">
                  {listing?.images?.[0] ? (
                    <img src={listing.images[0]} alt="" className="h-14 w-14 rounded object-cover" />
                  ) : (
                    <div className="h-14 w-14 rounded bg-muted grid place-items-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground">#{order.id.slice(0, 8)}</div>
                    <div className="font-medium truncate">
                      {listing?.title_ar ?? listing?.title_en ?? (ar ? "منتج" : "Product")}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {order.quantity} × {Number(order.unit_price ?? 0).toLocaleString(ar ? "ar-EG" : "en")} {order.currency ?? "EGP"}
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="font-semibold text-primary">
                      {Number(order.total_amount ?? 0).toLocaleString(ar ? "ar-EG" : "en")} {order.currency ?? "EGP"}
                    </div>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {ar ? "بانتظار البائع" : "Awaiting seller"}
                    </Badge>
                  </div>
                </div>
              ))}
              <div className="p-4 flex items-center justify-between bg-muted/30">
                <span className="font-semibold">{ar ? "الإجمالي" : "Total"}</span>
                <span className="font-bold text-primary text-lg">
                  {total.toLocaleString(ar ? "ar-EG" : "en")} {currency}
                </span>
              </div>
            </div>

            {/* Next steps */}
            <div className="mt-6 grid gap-3">
              {orders.length === 1 ? (
                <Button asChild size="lg" className="bg-primary hover:bg-primary-hover">
                  <Link to="/orders/$id" params={{ id: orders[0].order.id }}>
                    {ar ? "متابعة حالة الطلب" : "Track order status"}
                    <ArrowRight className="h-4 w-4 ms-2 rtl:rotate-180" />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="bg-primary hover:bg-primary-hover">
                  <Link to="/orders">
                    {ar ? "عرض جميع طلباتي" : "View all my orders"}
                    <ArrowRight className="h-4 w-4 ms-2 rtl:rotate-180" />
                  </Link>
                </Button>
              )}
              {orders.length === 1 && (
                <Button asChild variant="outline">
                  <Link to="/orders/$id/pay" params={{ id: orders[0].order.id }}>
                    <CreditCard className="h-4 w-4 me-2" />
                    {ar ? "الدفع الآن" : "Pay now"}
                  </Link>
                </Button>
              )}
              <Button asChild variant="ghost">
                <Link to="/">
                  <ShoppingBag className="h-4 w-4 me-2" />
                  {ar ? "متابعة التسوق" : "Continue shopping"}
                </Link>
              </Button>
            </div>

            <div className="mt-6 rounded-lg bg-muted/40 p-4 text-xs text-muted-foreground text-center">
              {ar
                ? "ستصلك إشعارات فور تغيّر حالة الطلب — اقبل، تجهيز، شحن، تسليم."
                : "You'll receive notifications as the order status changes — accepted, packed, shipped, delivered."}
            </div>
          </>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
