import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";
import { getWholesale, submitWholesaleOrder } from "@/lib/phase3.functions";

export const Route = createFileRoute("/wholesale/$id")({
  notFoundComponent: () => <Fallback msg="Wholesale listing not found" />,
  errorComponent: () => <Fallback msg="Something went wrong" />,
  component: WholesaleDetail,
});

function WholesaleDetail() {
  const { id } = Route.useParams();
  const { locale } = useI18n();
  const { user } = useAuth();
  const ar = locale === "ar";
  const [item, setItem] = useState<any>(null);
  const [qty, setQty] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => { getWholesale({ data: { id } }).then((r) => setItem(r.item)); }, [id]);

  async function order(e: React.FormEvent) {
    e.preventDefault();
    try {
      let referral_code: string | undefined;
      try { referral_code = localStorage.getItem("souqly.ref") || undefined; } catch { /* noop */ }
      await submitWholesaleOrder({ data: { listingId: id, quantity: Number(qty), contact_phone: phone || undefined, notes: notes || undefined, referral_code } });
      toast.success(ar ? "تم إرسال الطلب" : "Order submitted");
      setQty(""); setPhone(""); setNotes("");
    } catch (e: any) { toast.error(e.message); }
  }


  if (!item) return <div className="p-10 text-center">…</div>;
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1 grid lg:grid-cols-2 gap-8">
        <div>
          {item.images?.[0] && <img src={item.images[0]} alt="" className="rounded-lg w-full" />}
          <div className="grid grid-cols-4 gap-2 mt-2">{item.images?.slice(1).map((src: string, i: number) => <img key={i} src={src} className="rounded aspect-square object-cover" alt="" />)}</div>
        </div>
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">{item.title}</h1>
          <p className="text-muted-foreground whitespace-pre-wrap">{item.description}</p>
          <div className="rounded-lg border border-border bg-card p-4 grid grid-cols-2 gap-3 text-sm">
            {item.kind !== "storage" && <div><div className="text-xs text-muted-foreground">{ar ? "الحد الأدنى للطلب" : "MOQ"}</div><div className="font-semibold">{item.moq}{item.unit ? ` ${item.unit}` : ""}</div></div>}
            {item.wholesale_price ? (
              <div><div className="text-xs text-muted-foreground">{ar ? "سعر الجملة" : "Wholesale price"}</div><div className="font-semibold text-primary">{item.wholesale_price} {item.currency}{item.unit ? `/${item.unit}` : ""}</div></div>
            ) : null}
            {item.price_per_unit && <div><div className="text-xs text-muted-foreground">{ar ? "السعر/وحدة" : "Price/Unit"}</div><div className="font-semibold text-primary">{item.price_per_unit} {item.currency}</div></div>}
            {item.available_quantity != null && <div><div className="text-xs text-muted-foreground">{ar ? "المتوفر" : "Available"}</div><div>{item.available_quantity}{item.unit ? ` ${item.unit}` : ""}</div></div>}
            {item.governorate && <div><div className="text-xs text-muted-foreground">{ar ? "المحافظة" : "Governorate"}</div><div>{item.governorate}</div></div>}
            {item.city && <div><div className="text-xs text-muted-foreground">{ar ? "المدينة" : "City"}</div><div>{item.city}</div></div>}
            {item.delivery_available && <div className="col-span-2 text-xs text-emerald-600">✓ {ar ? "توصيل متاح" : "Delivery available"}</div>}
            {item.shipping_available && <div className="col-span-2 text-xs text-emerald-600">✓ {ar ? "شحن للمحافظات" : "Shipping available"}</div>}
            <div><div className="text-xs text-muted-foreground">{ar ? "المورد" : "Supplier"}</div><div>{ar ? item.companies?.name_ar : item.companies?.name_en}</div></div>
          </div>
          {item.kind === "storage" && item.attributes && Object.keys(item.attributes).length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4 grid grid-cols-2 gap-3 text-sm">
              {item.attributes.warehouse_type && <div><div className="text-xs text-muted-foreground">{ar ? "نوع المخزن" : "Warehouse type"}</div><div>{item.attributes.warehouse_type}</div></div>}
              {item.attributes.storage_type && <div><div className="text-xs text-muted-foreground">{ar ? "نوع التخزين" : "Storage type"}</div><div>{item.attributes.storage_type}</div></div>}
              {item.attributes.storage_area_sqm && <div><div className="text-xs text-muted-foreground">{ar ? "المساحة" : "Area"}</div><div>{item.attributes.storage_area_sqm} {ar ? "م²" : "sqm"}</div></div>}
              {item.attributes.available_capacity && <div><div className="text-xs text-muted-foreground">{ar ? "السعة المتاحة" : "Available capacity"}</div><div>{item.attributes.available_capacity}</div></div>}
              {item.attributes.suitable_goods && <div className="col-span-2"><div className="text-xs text-muted-foreground">{ar ? "السلع المناسبة" : "Suitable goods"}</div><div>{item.attributes.suitable_goods}</div></div>}
              {item.attributes.pricing_method && <div className="col-span-2"><div className="text-xs text-muted-foreground">{ar ? "طريقة التسعير" : "Pricing method"}</div><div>{item.attributes.pricing_method}</div></div>}
              {item.attributes.loading_unloading && <div className="col-span-2 text-xs text-emerald-600">✓ {ar ? "تحميل / تفريغ" : "Loading / unloading"}</div>}
            </div>
          )}
            <form onSubmit={order} className="rounded-lg border border-border bg-card p-5 shadow-card space-y-3">
              <h3 className="font-semibold">{ar ? "اطلب بالجملة" : "Place bulk order"}</h3>
              <Input type="number" min={item.moq} required placeholder={`${ar ? "الكمية" : "Quantity"} ≥ ${item.moq}`} value={qty} onChange={(e) => setQty(e.target.value)} />
              <Input placeholder={ar ? "رقم التواصل" : "Contact phone"} value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Textarea rows={3} placeholder={ar ? "ملاحظات" : "Notes"} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Button type="submit" className="w-full bg-primary hover:bg-primary-hover">{ar ? "إرسال الطلب" : "Submit order"}</Button>
            </form>
          ) : (
            <div className="text-sm text-muted-foreground">{ar ? "سجّل الدخول لتقديم طلب جملة" : "Sign in to place a bulk order"}</div>
          )}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}


function Fallback({ msg }: { msg: string }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 grid place-items-center p-10 text-center text-muted-foreground">{msg}</div>
      <SiteFooter />
    </div>
  );
}
