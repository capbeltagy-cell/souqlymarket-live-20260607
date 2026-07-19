import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BadgePercent, Loader2, MapPin, Plus, ShoppingBag, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/EmptyState";
import { useI18n } from "@/i18n/I18nProvider";
import { clearCart, getCart, subscribeCart, type CartItem } from "@/lib/cart";
import { formatPrice } from "@/lib/currency";
import { createStoreOrderFromListing, quoteStoreCoupon } from "@/lib/store-checkout.functions";
import { listMyAddresses, saveMyAddress, deleteMyAddress } from "@/lib/addresses.functions";
import { getShippingQuote } from "@/lib/shipping";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({ meta: [{ title: "إتمام الشراء — Souqly" }, { name: "description", content: "أكمل شراءك بأمان على سوقلي" }] }),
  component: CheckoutPage,
});

type Address = { id: string; label: string | null; recipient_name: string; phone: string; governorate: string; city: string; address_line: string; is_default: boolean };
type CouponQuote = { code: string; subtotal: number; discount: number; total_after_discount: number };

function CheckoutPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const navigate = useNavigate();
  const createOrder = useServerFn(createStoreOrderFromListing);
  const quoteCoupon = useServerFn(quoteStoreCoupon);
  const loadAddrs = useServerFn(listMyAddresses);
  const saveAddr = useServerFn(saveMyAddress);
  const delAddr = useServerFn(deleteMyAddress);

  const [items, setItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [couponCodes, setCouponCodes] = useState<Record<string, string>>({});
  const [couponQuotes, setCouponQuotes] = useState<Record<string, CouponQuote>>({});
  const [couponLoading, setCouponLoading] = useState<string | null>(null);
  const checkoutSessionId = useRef<string>(crypto.randomUUID());
  const [f, setF] = useState({ label: "", recipient_name: "", phone: "", governorate: "", city: "", address_line: "", is_default: true });

  useEffect(() => {
    setItems(getCart());
    const unsub = subscribeCart(() => setItems(getCart()));
    reloadAddresses();
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reloadAddresses() {
    setLoading(true);
    try {
      const list = (await loadAddrs()) as Address[];
      setAddresses(list);
      const def = list.find((a) => a.is_default) ?? list[0];
      if (def) { setSelectedId(def.id); setShowForm(false); } else setShowForm(true);
    } catch (error) { toast.error((error as Error).message); } finally { setLoading(false); }
  }

  async function submitAddress() {
    if (!f.recipient_name || !f.phone || !f.governorate || !f.city || !f.address_line) return toast.error(ar ? "أكمل بيانات العنوان" : "Complete address fields");
    try {
      const { id } = await saveAddr({ data: { ...f, label: f.label || null } });
      setF({ label: "", recipient_name: "", phone: "", governorate: "", city: "", address_line: "", is_default: false });
      await reloadAddresses(); setSelectedId(id); setShowForm(false); toast.success(ar ? "تم حفظ العنوان" : "Address saved");
    } catch (error) { toast.error((error as Error).message); }
  }

  async function removeAddress(id: string) {
    if (!confirm(ar ? "حذف هذا العنوان؟" : "Delete this address?")) return;
    try { await delAddr({ data: { id } }); await reloadAddresses(); } catch (error) { toast.error((error as Error).message); }
  }

  async function applyCoupon(item: CartItem) {
    const code = (couponCodes[item.listing_id] ?? "").trim();
    if (!code) return toast.error(ar ? "اكتب كود الخصم" : "Enter coupon code");
    setCouponLoading(item.listing_id);
    try {
      const quote = await quoteCoupon({ data: { listing_id: item.listing_id, quantity: item.quantity, code } }) as CouponQuote;
      setCouponQuotes((current) => ({ ...current, [item.listing_id]: quote }));
      setCouponCodes((current) => ({ ...current, [item.listing_id]: quote.code }));
      toast.success(ar ? `تم تطبيق خصم ${formatPrice(quote.discount, locale)}` : `Discount applied: ${formatPrice(quote.discount, locale)}`);
    } catch (error) {
      setCouponQuotes((current) => { const next = { ...current }; delete next[item.listing_id]; return next; });
      toast.error(couponError((error as Error).message, ar));
    } finally { setCouponLoading(null); }
  }

  const groups = groupByCompany(items);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountTotal = Object.values(couponQuotes).reduce((sum, quote) => sum + quote.discount, 0);
  const currency = items[0]?.currency ?? "EGP";
  const selectedAddress = addresses.find((a) => a.id === selectedId);
  const shipping = selectedAddress ? getShippingQuote(selectedAddress.governorate) : null;
  const shippingTotal = shipping ? shipping.amount * items.length : 0;
  const grandTotal = Math.max(0, total - discountTotal + shippingTotal);

  async function placeOrders() {
    if (!items.length) return;
    const addr = addresses.find((a) => a.id === selectedId);
    if (!addr) return toast.error(ar ? "اختر عنوان الشحن" : "Choose a shipping address");
    setPlacing(true);
    let referral_code: string | undefined;
    try { referral_code = localStorage.getItem("souqly.ref") || undefined; } catch { /* noop */ }
    const created: string[] = [];
    try {
      for (const item of items) {
        const quote = couponQuotes[item.listing_id];
        const { id } = await createOrder({ data: {
          listing_id: item.listing_id,
          checkout_session_id: checkoutSessionId.current,
          quantity: item.quantity,
          notes: notes || null,
          contact_phone: addr.phone,
          shipping_address: { recipient_name: addr.recipient_name, phone: addr.phone, governorate: addr.governorate, city: addr.city, address_line: addr.address_line },
          referral_code,
          coupon_code: quote?.code ?? null,
        } });
        created.push(id);
      }
      clearCart();
      toast.success(ar ? `تم إنشاء ${created.length} طلب/طلبات` : `Created ${created.length} order(s)`);
      navigate({ to: "/orders/$id/confirmation", params: { id: created[0] }, search: { ids: created.join(",") } });
    } catch (error) { toast.error(couponError((error as Error).message, ar)); } finally { setPlacing(false); }
  }

  if (!items.length && !placing) return <div className="min-h-screen flex flex-col"><SiteHeader /><section className="container-souqly py-8 flex-1"><EmptyState icon={<ShoppingBag className="h-7 w-7" />} title={ar ? "السلة فارغة" : "Cart is empty"} description={ar ? "أضف منتجات إلى السلة قبل إتمام الشراء" : "Add products to cart before checkout"} ctaLabel={ar ? "تصفح المنتجات" : "Browse products"} ctaTo="/" /></section><SiteFooter /></div>;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-8 flex-1">
        <h1 className="text-2xl font-bold mb-6">{ar ? "إتمام الشراء" : "Checkout"}</h1>
        <div className="grid lg:grid-cols-[1fr,340px] gap-6">
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4"><h2 className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4" />{ar ? "عنوان الشحن" : "Shipping address"}</h2>{addresses.length > 0 && !showForm && <Button size="sm" variant="outline" onClick={() => setShowForm(true)}><Plus className="h-3 w-3 me-1" />{ar ? "إضافة عنوان" : "Add address"}</Button>}</div>
              {loading ? <div className="text-sm text-muted-foreground py-4">{ar ? "جارٍ التحميل…" : "Loading…"}</div> : <>
                {addresses.length > 0 && !showForm && <ul className="space-y-2">{addresses.map((address) => <li key={address.id}><label className={`flex gap-3 items-start p-3 rounded-md border cursor-pointer transition ${selectedId === address.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"}`}><input type="radio" name="addr" checked={selectedId === address.id} onChange={() => setSelectedId(address.id)} className="mt-1" /><div className="flex-1 min-w-0 text-sm"><div className="font-semibold">{address.label ? `${address.label} — ` : ""}{address.recipient_name}{address.is_default && <span className="ms-2 text-xs text-primary">({ar ? "افتراضي" : "default"})</span>}</div><div className="text-muted-foreground mt-0.5">{address.phone} • {address.address_line}, {address.city}, {address.governorate}</div></div><Button size="icon" variant="ghost" onClick={(event) => { event.preventDefault(); removeAddress(address.id); }} aria-label="delete"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></label></li>)}</ul>}
                {showForm && <div className="space-y-3"><div className="grid sm:grid-cols-2 gap-3"><Field label={ar ? "الاسم" : "Name"} value={f.recipient_name} onChange={(value) => setF({ ...f, recipient_name: value })} /><Field label={ar ? "الهاتف" : "Phone"} value={f.phone} onChange={(value) => setF({ ...f, phone: value })} /><Field label={ar ? "المحافظة" : "Governorate"} value={f.governorate} onChange={(value) => setF({ ...f, governorate: value })} /><Field label={ar ? "المدينة" : "City"} value={f.city} onChange={(value) => setF({ ...f, city: value })} /><div className="sm:col-span-2"><Field label={ar ? "العنوان بالتفصيل" : "Address line"} value={f.address_line} onChange={(value) => setF({ ...f, address_line: value })} /></div><div className="sm:col-span-2"><Field label={ar ? "تسمية العنوان (اختياري)" : "Label (optional)"} value={f.label} onChange={(value) => setF({ ...f, label: value })} /></div></div><label className="flex items-center gap-2 text-sm"><Checkbox checked={f.is_default} onCheckedChange={(value) => setF({ ...f, is_default: !!value })} />{ar ? "اجعله العنوان الافتراضي" : "Make this my default address"}</label><div className="flex gap-2"><Button onClick={submitAddress}>{ar ? "حفظ العنوان" : "Save address"}</Button>{addresses.length > 0 && <Button variant="ghost" onClick={() => setShowForm(false)}>{ar ? "إلغاء" : "Cancel"}</Button>}</div></div>}
              </>}
            </div>

            <div className="rounded-lg border border-border bg-card"><div className="px-5 py-3 border-b border-border font-semibold">{ar ? "المنتجات" : "Items"} ({items.length})</div><div className="p-4 space-y-5">{groups.map((group) => <div key={group.companyKey}><div className="text-xs text-muted-foreground mb-2">{ar ? "البائع" : "Seller"}: {group.companyName}</div><ul className="divide-y divide-border">{group.items.map((item) => { const quote = couponQuotes[item.listing_id]; return <li key={item.listing_id} className="py-3 space-y-3"><div className="flex gap-3 items-center">{item.image ? <img src={item.image} alt="" className="h-12 w-12 rounded object-cover" /> : <div className="h-12 w-12 rounded bg-muted" />}<div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{item.title}</div><div className="text-xs text-muted-foreground">{item.quantity} × {formatPrice(item.price, locale)}</div></div><div className="text-sm font-semibold text-primary">{formatPrice(item.price * item.quantity, locale)}</div></div><div className="flex gap-2"><Input value={couponCodes[item.listing_id] ?? ""} onChange={(event) => { setCouponCodes((current) => ({ ...current, [item.listing_id]: event.target.value.toUpperCase() })); setCouponQuotes((current) => { const next = { ...current }; delete next[item.listing_id]; return next; }); }} placeholder={ar ? "كود خصم لهذا المنتج" : "Coupon for this item"} /><Button type="button" variant="outline" onClick={() => applyCoupon(item)} disabled={couponLoading === item.listing_id}>{couponLoading === item.listing_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgePercent className="h-4 w-4" />}</Button></div>{quote && <div className="text-xs text-success">{ar ? `تم تطبيق ${quote.code} — خصم ${formatPrice(quote.discount, locale)}` : `${quote.code} applied — ${formatPrice(quote.discount, locale)} off`}</div>}</li>; })}</ul></div>)}</div></div>

            <div className="rounded-lg border border-border bg-card p-5"><Label className="text-sm font-semibold">{ar ? "ملاحظات للطلب (اختياري)" : "Order notes (optional)"}</Label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={ar ? "تعليمات خاصة للبائع..." : "Special instructions to the seller..."} rows={3} className="mt-2" /></div>
          </div>

          <aside className="rounded-lg border border-border bg-card p-5 h-fit space-y-3 sticky top-20"><h3 className="font-semibold">{ar ? "ملخص الطلب" : "Order summary"}</h3><Summary label={ar ? "قيمة المنتجات" : "Items subtotal"} value={formatPrice(total, locale)} /><Summary label={ar ? "عدد البائعين" : "Sellers"} value={String(groups.length)} />{discountTotal > 0 && <Summary label={ar ? "الخصومات" : "Discounts"} value={`- ${formatPrice(discountTotal, locale)}`} success />}<Summary label={ar ? "الشحن" : "Shipping"} value={shipping ? formatPrice(shippingTotal, locale) : (ar ? "اختر العنوان" : "Choose address")} />{shipping && <div className="flex justify-between text-xs text-muted-foreground"><span>{ar ? "التوصيل المتوقع" : "Estimated delivery"}</span><span>{shipping.etaMinDays}–{shipping.etaMaxDays} {ar ? "أيام عمل" : "business days"}</span></div>}<div className="flex justify-between font-semibold border-t border-border pt-3"><span>{ar ? "الإجمالي" : "Total"}</span><span className="text-primary">{formatPrice(grandTotal, locale)} {currency !== "EGP" && currency}</span></div><Button className="w-full" onClick={placeOrders} disabled={placing || !selectedId}>{placing && <Loader2 className="h-4 w-4 animate-spin me-2" />}{ar ? "تأكيد الطلب" : "Place order"}</Button><div className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3" />{ar ? "الأسعار والخصومات يعاد التحقق منها على السيرفر" : "Prices and discounts are verified server-side"}</div></aside>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <div><Label className="text-xs">{label} *</Label><Input value={value} onChange={(event) => onChange(event.target.value)} /></div>; }
function Summary({ label, value, success = false }: { label: string; value: string; success?: boolean }) { return <div className="flex justify-between text-sm"><span>{label}</span><span className={success ? "text-success font-semibold" : "text-muted-foreground"}>{value}</span></div>; }
function groupByCompany(items: CartItem[]) { const map = new Map<string, CartItem[]>(); for (const item of items) { const key = item.company_id ?? "unknown"; map.set(key, [...(map.get(key) ?? []), item]); } return Array.from(map.entries()).map(([companyKey, list]) => ({ companyKey, companyName: list[0]?.company_name || `#${companyKey.slice(0, 8)}`, items: list })); }
function couponError(message: string, ar: boolean) { const map: Record<string, [string, string]> = { INVALID_COUPON: ["كود الخصم غير صحيح", "Invalid coupon"], COUPON_NOT_AVAILABLE: ["هذا البائع لا يتيح كوبونات حاليًا", "Coupons are not available for this seller"], COUPON_NOT_STARTED: ["الكوبون لم يبدأ بعد", "Coupon has not started yet"], COUPON_EXPIRED: ["انتهت صلاحية الكوبون", "Coupon has expired"], COUPON_LIMIT_REACHED: ["وصل الكوبون للحد الأقصى للاستخدام", "Coupon usage limit reached"], COUPON_MINIMUM_NOT_MET: ["قيمة المنتج أقل من الحد الأدنى للكوبون", "Minimum order amount not met"] }; return map[message]?.[ar ? 0 : 1] ?? message; }
