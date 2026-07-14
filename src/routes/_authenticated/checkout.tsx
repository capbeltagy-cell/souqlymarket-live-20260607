import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin, Plus, ShoppingBag, ShieldCheck, Trash2 } from "lucide-react";
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
import { createOrderFromListing } from "@/lib/orders.functions";
import { listMyAddresses, saveMyAddress, deleteMyAddress } from "@/lib/addresses.functions";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({ meta: [{ title: "إتمام الشراء — Souqly" }, { name: "description", content: "أكمل شراءك بأمان على سوقلي" }] }),
  component: CheckoutPage,
});

type Address = {
  id: string;
  label: string | null;
  recipient_name: string;
  phone: string;
  governorate: string;
  city: string;
  address_line: string;
  is_default: boolean;
};

function CheckoutPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const navigate = useNavigate();
  const createOrder = useServerFn(createOrderFromListing);
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

  // Form fields for new address
  const [f, setF] = useState({
    label: "", recipient_name: "", phone: "", governorate: "", city: "", address_line: "", is_default: true,
  });

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
      if (def) { setSelectedId(def.id); setShowForm(false); }
      else { setShowForm(true); }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submitAddress() {
    if (!f.recipient_name || !f.phone || !f.governorate || !f.city || !f.address_line) {
      toast.error(ar ? "أكمل بيانات العنوان" : "Complete address fields");
      return;
    }
    try {
      const { id } = await saveAddr({ data: { ...f, label: f.label || null } });
      setF({ label: "", recipient_name: "", phone: "", governorate: "", city: "", address_line: "", is_default: false });
      await reloadAddresses();
      setSelectedId(id);
      setShowForm(false);
      toast.success(ar ? "تم حفظ العنوان" : "Address saved");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function removeAddress(id: string) {
    if (!confirm(ar ? "حذف هذا العنوان؟" : "Delete this address?")) return;
    try {
      await delAddr({ data: { id } });
      await reloadAddresses();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const groups = groupByCompany(items);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const currency = items[0]?.currency ?? "EGP";

  async function placeOrders() {
    if (items.length === 0) return;
    const addr = addresses.find((a) => a.id === selectedId);
    if (!addr) { toast.error(ar ? "اختر عنوان الشحن" : "Choose a shipping address"); return; }
    setPlacing(true);
    let referral_code: string | undefined;
    try { referral_code = localStorage.getItem("souqly.ref") || undefined; } catch { /* noop */ }
    const created: string[] = [];
    try {
      for (const it of items) {
        const { id } = await createOrder({
          data: {
            listing_id: it.listing_id,
            quantity: it.quantity,
            notes: notes || null,
            contact_phone: addr.phone,
            shipping_address: {
              recipient_name: addr.recipient_name,
              phone: addr.phone,
              governorate: addr.governorate,
              city: addr.city,
              address_line: addr.address_line,
            },
            referral_code,
          },
        });
        created.push(id);
      }
      clearCart();
      toast.success(ar ? `تم إنشاء ${created.length} طلب/طلبات` : `Created ${created.length} order(s)`);
      // Navigate to confirmation with the first order id + list of ids
      navigate({
        to: "/orders/$id/confirmation",
        params: { id: created[0] },
        search: { ids: created.join(",") },
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPlacing(false);
    }
  }

  if (items.length === 0 && !placing) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <section className="container-souqly py-8 flex-1">
          <EmptyState
            icon={<ShoppingBag className="h-7 w-7" />}
            title={ar ? "السلة فارغة" : "Cart is empty"}
            description={ar ? "أضف منتجات إلى السلة قبل إتمام الشراء" : "Add products to cart before checkout"}
            ctaLabel={ar ? "تصفح المنتجات" : "Browse products"}
            ctaTo="/"
          />
        </section>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-8 flex-1">
        <h1 className="text-2xl font-bold mb-6">{ar ? "إتمام الشراء" : "Checkout"}</h1>

        <div className="grid lg:grid-cols-[1fr,340px] gap-6">
          <div className="space-y-6">
            {/* Shipping address */}
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {ar ? "عنوان الشحن" : "Shipping address"}
                </h2>
                {addresses.length > 0 && !showForm && (
                  <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
                    <Plus className="h-3 w-3 me-1" /> {ar ? "إضافة عنوان" : "Add address"}
                  </Button>
                )}
              </div>

              {loading ? (
                <div className="text-sm text-muted-foreground py-4">{ar ? "جارٍ التحميل…" : "Loading…"}</div>
              ) : (
                <>
                  {addresses.length > 0 && !showForm && (
                    <ul className="space-y-2">
                      {addresses.map((a) => (
                        <li key={a.id}>
                          <label className={`flex gap-3 items-start p-3 rounded-md border cursor-pointer transition ${selectedId === a.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"}`}>
                            <input
                              type="radio"
                              name="addr"
                              checked={selectedId === a.id}
                              onChange={() => setSelectedId(a.id)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0 text-sm">
                              <div className="font-semibold">
                                {a.label ? `${a.label} — ` : ""}{a.recipient_name}
                                {a.is_default && (
                                  <span className="ms-2 text-xs text-primary">({ar ? "افتراضي" : "default"})</span>
                                )}
                              </div>
                              <div className="text-muted-foreground mt-0.5">
                                {a.phone} • {a.address_line}, {a.city}, {a.governorate}
                              </div>
                            </div>
                            <Button size="icon" variant="ghost" onClick={(e) => { e.preventDefault(); removeAddress(a.id); }} aria-label="delete">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}

                  {showForm && (
                    <div className="space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">{ar ? "الاسم" : "Name"} *</Label>
                          <Input value={f.recipient_name} onChange={(e) => setF({ ...f, recipient_name: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">{ar ? "الهاتف" : "Phone"} *</Label>
                          <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">{ar ? "المحافظة" : "Governorate"} *</Label>
                          <Input value={f.governorate} onChange={(e) => setF({ ...f, governorate: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">{ar ? "المدينة" : "City"} *</Label>
                          <Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs">{ar ? "العنوان بالتفصيل" : "Address line"} *</Label>
                          <Input value={f.address_line} onChange={(e) => setF({ ...f, address_line: e.target.value })} />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs">{ar ? "تسمية العنوان (اختياري)" : "Label (optional)"}</Label>
                          <Input placeholder={ar ? "المنزل، العمل..." : "Home, Work..."} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={f.is_default} onCheckedChange={(v) => setF({ ...f, is_default: !!v })} />
                        {ar ? "اجعله العنوان الافتراضي" : "Make this my default address"}
                      </label>
                      <div className="flex gap-2">
                        <Button onClick={submitAddress} className="bg-primary hover:bg-primary-hover">
                          {ar ? "حفظ العنوان" : "Save address"}
                        </Button>
                        {addresses.length > 0 && (
                          <Button variant="ghost" onClick={() => setShowForm(false)}>
                            {ar ? "إلغاء" : "Cancel"}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Items */}
            <div className="rounded-lg border border-border bg-card">
              <div className="px-5 py-3 border-b border-border font-semibold">
                {ar ? "المنتجات" : "Items"} ({items.length})
              </div>
              <div className="p-4 space-y-4">
                {groups.map((g) => (
                  <div key={g.companyKey}>
                    <div className="text-xs text-muted-foreground mb-2">
                      {ar ? "بائع" : "Seller"} #{g.companyKey.slice(0, 8)}
                    </div>
                    <ul className="divide-y divide-border">
                      {g.items.map((it) => (
                        <li key={it.listing_id} className="py-2 flex gap-3 items-center">
                          {it.image ? (
                            <img src={it.image} alt="" className="h-12 w-12 rounded object-cover" />
                          ) : (
                            <div className="h-12 w-12 rounded bg-muted" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{it.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {it.quantity} × {formatPrice(it.price, locale)}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-primary">
                            {formatPrice(it.price * it.quantity, locale)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Order notes */}
            <div className="rounded-lg border border-border bg-card p-5">
              <Label className="text-sm font-semibold">{ar ? "ملاحظات للطلب (اختياري)" : "Order notes (optional)"}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={ar ? "تعليمات خاصة للبائع..." : "Special instructions to the seller..."}
                rows={3}
                className="mt-2"
              />
            </div>
          </div>

          {/* Summary */}
          <aside className="rounded-lg border border-border bg-card p-5 h-fit space-y-3 sticky top-20">
            <h3 className="font-semibold">{ar ? "ملخص الطلب" : "Order summary"}</h3>
            <div className="flex justify-between text-sm">
              <span>{ar ? "عدد المنتجات" : "Items"}</span>
              <span>{items.reduce((s, i) => s + i.quantity, 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{ar ? "عدد البائعين" : "Sellers"}</span>
              <span>{groups.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{ar ? "الشحن" : "Shipping"}</span>
              <span className="text-muted-foreground">{ar ? "يُحسب لاحقًا" : "Calculated later"}</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-border pt-3">
              <span>{ar ? "الإجمالي" : "Total"}</span>
              <span className="text-primary">{formatPrice(total, locale)} {currency !== "EGP" && currency}</span>
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary-hover"
              onClick={placeOrders}
              disabled={placing || !selectedId}
            >
              {placing && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {ar ? "تأكيد الطلب" : "Place order"}
            </Button>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              {ar ? "مدفوعاتك محمية عبر سوقلي" : "Payments protected by Souqly"}
            </div>
            {groups.length > 1 && (
              <p className="text-xs text-muted-foreground">
                {ar
                  ? "سيتم إنشاء طلب منفصل لكل بائع."
                  : "A separate order will be created for each seller."}
              </p>
            )}
          </aside>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function groupByCompany(items: CartItem[]) {
  const map = new Map<string, CartItem[]>();
  for (const it of items) {
    const key = it.company_id ?? "unknown";
    const list = map.get(key) ?? [];
    list.push(it);
    map.set(key, list);
  }
  return Array.from(map.entries()).map(([companyKey, list]) => ({ companyKey, items: list }));
}
