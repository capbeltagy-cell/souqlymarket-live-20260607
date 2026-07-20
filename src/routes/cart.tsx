import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";
import {
  clearCart,
  getCart,
  removeFromCart,
  subscribeCart,
  updateQty,
  type CartItem,
} from "@/lib/cart";
import { formatPrice } from "@/lib/currency";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "السلة — Souqly" },
      { name: "description", content: "سلة المشتريات على سوقلي" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    setItems(getCart());
    return subscribeCart(() => setItems(getCart()));
  }, []);

  const groups = groupByCompany(items);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const currency = items[0]?.currency ?? "EGP";

  function checkout() {
    if (!user) {
      toast.error(ar ? "سجّل الدخول لإتمام الشراء" : "Sign in to checkout");
      navigate({ to: "/auth" });
      return;
    }
    if (items.length === 0) return;
    navigate({ to: "/checkout" });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-8 flex-1">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" />
          {ar ? "سلة المشتريات" : "Your cart"}
        </h1>

        {items.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart className="h-7 w-7" />}
            title={ar ? "السلة فارغة" : "Cart is empty"}
            description={
              ar ? "تصفح السوق وأضف منتجات لسلتك" : "Browse the marketplace and add products"
            }
          />
        ) : (
          <div className="grid lg:grid-cols-[1fr,320px] gap-6">
            <div className="space-y-6">
              {groups.map((g) => (
                <div key={g.companyKey} className="rounded-lg border border-border bg-card">
                  <div className="px-4 py-3 border-b border-border text-sm text-muted-foreground">
                    {ar ? "البائع" : "Seller"}:{" "}
                    <span className="font-semibold text-foreground">{g.companyName}</span>
                  </div>
                  <ul className="divide-y divide-border">
                    {g.items.map((it) => (
                      <li key={it.listing_id} className="p-4 flex gap-3 items-center">
                        {it.image ? (
                          <img src={it.image} alt="" className="h-16 w-16 rounded object-cover" />
                        ) : (
                          <div className="h-16 w-16 rounded bg-muted" />
                        )}
                        <div className="flex-1 min-w-0">
                          <Link
                            to="/listings/$id"
                            params={{ id: it.listing_id }}
                            className="font-medium hover:underline line-clamp-2"
                          >
                            {it.title}
                          </Link>
                          <div className="text-sm text-primary font-semibold mt-1">
                            {formatPrice(it.price, locale)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => updateQty(it.listing_id, it.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{it.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => updateQty(it.listing_id, it.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeFromCart(it.listing_id)}
                          aria-label="remove"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

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
              <div className="flex justify-between font-semibold border-t border-border pt-3">
                <span>{ar ? "الإجمالي" : "Total"}</span>
                <span className="text-primary">
                  {formatPrice(total, locale)} {currency !== "EGP" && currency}
                </span>
              </div>
              <Button
                className="w-full bg-primary hover:bg-primary-hover"
                onClick={checkout}
                disabled={placing}
              >
                {ar ? "إتمام الشراء" : "Checkout"}
              </Button>
              {groups.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  {ar
                    ? "سيتم إنشاء طلب منفصل لكل بائع."
                    : "A separate order will be created for each seller."}
                </p>
              )}
              <Button variant="ghost" className="w-full" onClick={() => clearCart()}>
                {ar ? "إفراغ السلة" : "Clear cart"}
              </Button>
            </aside>
          </div>
        )}
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
  return Array.from(map.entries()).map(([companyKey, list]) => ({
    companyKey,
    companyName: list[0]?.company_name || `#${companyKey.slice(0, 8)}`,
    items: list,
  }));
}
