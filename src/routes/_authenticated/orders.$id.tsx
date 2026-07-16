import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Circle, Package, Truck, Home, ShieldCheck, XCircle, RotateCcw, CreditCard, MessageSquare, RefreshCw, FileText, Gift } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getOrder, updateOrderStatus } from "@/lib/orders.functions";
// Buyer↔company direct messaging removed — support goes through Souqly.
import { addToCart } from "@/lib/cart";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  head: ({ params }) => ({ meta: [{ title: `طلب #${params.id.slice(0, 8)} — Souqly` }] }),
  component: OrderDetailPage,
});

const TIMELINE: Array<{ key: string; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "awaiting_seller", label: "بانتظار البائع", icon: Circle },
  { key: "accepted", label: "مقبول", icon: CheckCircle2 },
  { key: "packed", label: "تم التجهيز", icon: Package },
  { key: "shipped", label: "تم الشحن", icon: Truck },
  { key: "delivered", label: "تم التسليم", icon: Home },
  { key: "completed", label: "مكتمل", icon: ShieldCheck },
];

function OrderDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const load = useServerFn(getOrder);
  const update = useServerFn(updateOrderStatus);
  
  const [data, setData] = useState<{ order: any; listing: any; company?: any } | null>(null);
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = () => load({ data: { id } }).then((r) => { setData(r as any); setTracking(r.order.tracking_number ?? ""); setCarrier(r.order.tracking_carrier ?? ""); }).catch((e) => toast.error(e.message));
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [id]);

  if (!data) return <div className="min-h-screen flex flex-col"><SiteHeader /><div className="container-souqly py-8 flex-1 text-muted-foreground">جارٍ التحميل…</div><SiteFooter /></div>;
  const { order, listing, company } = data;
  const isBuyer = order.buyer_id === user?.id;
  const activeIdx = TIMELINE.findIndex((s) => s.key === order.status);


  const reorder = () => {
    if (!listing) return;
    addToCart({
      listing_id: listing.id,
      company_id: listing.company_id ?? null,
      title: listing.title_ar ?? listing.title_en ?? "منتج",
      image: listing.images?.[0] ?? null,
      price: Number(order.unit_price ?? 0),
      currency: order.currency ?? "EGP",
      quantity: order.quantity ?? 1,
    });
    toast.success("تمت الإضافة إلى السلة");
    navigate({ to: "/cart" });
  };


  const act = async (patch: { id: string; status: any; tracking_number?: string | null; tracking_carrier?: string | null; cancelled_reason?: string | null }) => {
    setBusy(true);
    try { await update({ data: patch }); toast.success("تم التحديث"); reload(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-8 flex-1 max-w-3xl mx-auto w-full">
        <button onClick={() => navigate({ to: "/orders" })} className="text-sm text-muted-foreground mb-4">← رجوع للطلبات</button>
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
            <div>
              <h1 className="text-xl font-bold">طلب #{order.id.slice(0, 8)}</h1>
              <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("ar-EG")}</div>
            </div>
            <div className="text-end">
              <div className="text-2xl font-bold">{Number(order.total_amount ?? 0).toLocaleString("ar-EG")} {order.currency ?? "EGP"}</div>
              <Badge className="mt-1">{order.quantity} قطعة</Badge>
            </div>
          </div>

          {listing && (
            <Link to="/listings/$id" params={{ id: listing.id }} className="flex items-center gap-3 rounded-lg border border-border p-3 mb-6 hover:border-primary transition">
              {listing.images?.[0] && <img src={listing.images[0]} alt="" className="h-16 w-16 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{listing.title_ar ?? listing.title_en}</div>
                <div className="text-xs text-muted-foreground">عرض المنتج ←</div>
              </div>
            </Link>
          )}

          {/* Timeline */}
          <div className="relative mb-6">
            <div className="flex justify-between items-center">
              {TIMELINE.map((step, i) => {
                const done = i <= activeIdx;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex flex-col items-center flex-1">
                    <div className={`h-9 w-9 rounded-full grid place-items-center border-2 ${done ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-border text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className={`text-[10px] mt-1 text-center ${done ? "font-semibold" : "text-muted-foreground"}`}>{step.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {company && (
            <Link to="/companies/$id" params={{ id: company.id }} className="flex items-center gap-3 rounded-lg border border-border p-3 mb-4 hover:border-primary transition">
              {company.logo_url && <img src={company.logo_url} alt="" className="h-10 w-10 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">الشركة</div>
                <div className="font-medium truncate">{company.name_ar ?? company.name_en}</div>
              </div>
            </Link>
          )}

          {order.referral_code && (
            <div className="rounded-md bg-primary/10 border border-primary/40 p-3 mb-4 text-sm flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              <span>هذا الطلب مرتبط بكود إحالة تسويقية <span className="font-mono">{order.referral_code}</span></span>
            </div>
          )}

          {(order.status === "cancelled" || order.status === "returned" || order.status === "rejected") && (
            <div className="rounded-md bg-destructive/10 border border-destructive/40 p-3 mb-4 text-sm text-destructive">
              الطلب {order.status === "cancelled" ? "ملغي" : order.status === "returned" ? "مُرتجع" : "مرفوض"}
              {order.cancelled_reason && ` — ${order.cancelled_reason}`}
            </div>
          )}


          {order.shipping_address && (
            <div className="rounded-lg border border-border p-3 mb-4 text-sm">
              <div className="font-semibold mb-1">عنوان الشحن</div>
              <div className="text-muted-foreground">
                {order.shipping_address.recipient_name} • {order.shipping_address.phone}<br />
                {order.shipping_address.address_line}, {order.shipping_address.city}, {order.shipping_address.governorate}
              </div>
            </div>
          )}

          {order.tracking_number && (
            <div className="rounded-lg border border-border p-3 mb-4 text-sm">
              <div className="font-semibold mb-1">تتبع الشحنة</div>
              <div className="text-muted-foreground">{order.tracking_carrier ?? "شركة الشحن"} — رقم: <span className="font-mono">{order.tracking_number}</span></div>
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-border pt-4 flex flex-wrap gap-2">
            {isBuyer && order.payment_status !== "paid" && ["accepted","awaiting_seller","packed"].includes(order.status) && (
              <Button asChild className="bg-primary hover:bg-primary-hover">
                <Link to="/orders/$id/pay" params={{ id: order.id }}>
                  <CreditCard className="h-4 w-4 me-2" /> ادفع الآن
                </Link>
              </Button>
            )}
            {order.payment_status === "paid" && (
              <Badge className="bg-success text-white"><ShieldCheck className="h-3 w-3 me-1" /> مدفوع — محفوظ لدى المنصة</Badge>
            )}
            {order.payment_status === "pending_review" && (
              <Badge variant="secondary">⏳ إثبات الدفع قيد المراجعة</Badge>
            )}
            {!isBuyer && order.status === "awaiting_seller" && (
              <>
                <Button onClick={() => act({ id: order.id, status: "accepted" })} disabled={busy} className="bg-primary hover:bg-primary-hover">قبول الطلب</Button>
                <Button onClick={() => act({ id: order.id, status: "rejected", cancelled_reason: "تم الرفض من البائع" })} disabled={busy} variant="outline">رفض</Button>
              </>
            )}
            {!isBuyer && order.status === "accepted" && (
              <Button onClick={() => act({ id: order.id, status: "packed" })} disabled={busy} className="bg-primary hover:bg-primary-hover">تم التجهيز</Button>
            )}
            {!isBuyer && order.status === "packed" && (
              <div className="w-full space-y-2">
                <div className="flex gap-2">
                  <Input placeholder="شركة الشحن" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
                  <Input placeholder="رقم التتبع" value={tracking} onChange={(e) => setTracking(e.target.value)} />
                </div>
                <Button onClick={() => act({ id: order.id, status: "shipped", tracking_number: tracking, tracking_carrier: carrier })} disabled={busy || !tracking} className="w-full bg-primary hover:bg-primary-hover">
                  <Truck className="h-4 w-4 me-2" />تم الشحن
                </Button>
              </div>
            )}
            {!isBuyer && order.status === "shipped" && (
              <Button onClick={() => act({ id: order.id, status: "delivered" })} disabled={busy} className="bg-primary hover:bg-primary-hover">تأكيد التسليم</Button>
            )}
            {isBuyer && order.status === "delivered" && (
              <Button onClick={() => act({ id: order.id, status: "completed" })} disabled={busy} className="bg-success hover:opacity-90">
                <ShieldCheck className="h-4 w-4 me-2" />استلمت الطلب — إتمام
              </Button>
            )}
            {isBuyer && order.status === "delivered" && (
              <Button onClick={() => act({ id: order.id, status: "returned", cancelled_reason: "طلب إرجاع من المشتري" })} disabled={busy} variant="outline">
                <RotateCcw className="h-4 w-4 me-2" />إرجاع
              </Button>
            )}
            {(order.status === "awaiting_seller" || order.status === "accepted") && isBuyer && (
              <Button onClick={() => act({ id: order.id, status: "cancelled", cancelled_reason: "ملغي من المشتري" })} disabled={busy} variant="outline">
                <XCircle className="h-4 w-4 me-2" />إلغاء
              </Button>
            )}
            {isBuyer && (
              <>
                <Button asChild variant="outline">
                  <Link to="/contact">
                    <MessageSquare className="h-4 w-4 me-2" />تواصل مع دعم سوقلي
                  </Link>
                </Button>
                {listing && (
                  <Button onClick={reorder} variant="outline">
                    <RefreshCw className="h-4 w-4 me-2" />إعادة الطلب
                  </Button>
                )}
                {order.payment_status === "paid" && (
                  <Button asChild variant="outline">
                    <Link to="/invoices">
                      <FileText className="h-4 w-4 me-2" />الفواتير
                    </Link>
                  </Button>
                )}
              </>
            )}
            {!isBuyer && order.conversation_id && (
              <Button asChild variant="outline">
                <Link to="/messages" search={{ c: order.conversation_id } as any}>
                  <MessageSquare className="h-4 w-4 me-2" />فتح المحادثة
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
