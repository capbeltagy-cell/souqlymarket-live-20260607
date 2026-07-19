import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, PackageOpen, Star, Store as StoreIcon } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/currency";
import { getPublicStore } from "@/lib/stores.functions";

export const Route = createFileRoute("/stores/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — سوقلي` }] }),
  component: PublicStorePage,
});

type StorePayload = {
  store: {
    name_ar: string;
    description_ar: string | null;
    logo_url: string | null;
    banner_url: string | null;
    primary_color: string;
    accent_color: string;
    city: string | null;
    governorate: string | null;
    shipping_policy: string | null;
    return_policy: string | null;
  };
  categories: Array<{ id: string; name_ar: string; slug: string }>;
  listings: Array<{
    id: string;
    title_ar: string;
    description_ar: string | null;
    price: number | null;
    currency: string;
    images: string[] | null;
    category: string | null;
    city: string | null;
    governorate: string | null;
    stock_quantity: number | null;
    track_inventory: boolean;
    store_category_id: string | null;
    is_featured: boolean;
  }>;
};

function PublicStorePage() {
  const { slug } = Route.useParams();
  const loadStore = useServerFn(getPublicStore);
  const [payload, setPayload] = useState<StorePayload | null | undefined>(undefined);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    loadStore({ data: { slug } })
      .then((result) => setPayload(result as StorePayload | null))
      .catch(() => setPayload(null));
  }, [loadStore, slug]);

  const filteredListings = useMemo(() => {
    if (!payload) return [];
    return activeCategory === "all" ? payload.listings : payload.listings.filter((item) => item.store_category_id === activeCategory);
  }, [payload, activeCategory]);

  if (payload === undefined) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  if (!payload) {
    return (
      <div className="min-h-screen flex flex-col" dir="rtl">
        <SiteHeader />
        <main className="container-souqly flex-1 py-24 text-center">
          <StoreIcon className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold mt-4">المتجر غير متاح</h1>
          <p className="text-muted-foreground mt-2">قد يكون المتجر تحت المراجعة أو تم إيقافه مؤقتًا.</p>
          <Button asChild className="mt-6"><Link to="/stores">تصفح المتاجر</Link></Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const { store, categories, listings } = payload;
  const featured = listings.filter((item) => item.is_featured);

  return (
    <div className="min-h-screen flex flex-col bg-muted/20" dir="rtl">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative">
          <div className="h-56 md:h-72 bg-muted bg-cover bg-center" style={{ backgroundImage: store.banner_url ? `url(${store.banner_url})` : `linear-gradient(135deg, ${store.primary_color}, ${store.accent_color})` }} />
          <div className="container-souqly">
            <div className="relative -mt-14 rounded-2xl border bg-card p-5 md:p-7 shadow-sm flex flex-col md:flex-row gap-5 md:items-end">
              <div className="h-28 w-28 shrink-0 rounded-2xl border-4 border-card bg-muted overflow-hidden flex items-center justify-center">
                {store.logo_url ? <img src={store.logo_url} alt={store.name_ar} className="h-full w-full object-cover" /> : <StoreIcon className="h-10 w-10" />}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold">{store.name_ar}</h1>
                {(store.city || store.governorate) && <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1"><MapPin className="h-4 w-4" /> {[store.city, store.governorate].filter(Boolean).join("، ")}</p>}
                {store.description_ar && <p className="mt-3 max-w-3xl text-muted-foreground">{store.description_ar}</p>}
              </div>
              <div className="rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: store.primary_color }}>متجر داخل سوقلي</div>
            </div>
          </div>
        </section>

        <section className="container-souqly py-10 space-y-10">
          {featured.length > 0 && activeCategory === "all" && (
            <div>
              <div className="flex items-center gap-2 mb-5"><Star className="h-5 w-5" style={{ color: store.accent_color }} /><h2 className="text-2xl font-bold">منتجات مميزة</h2></div>
              <ProductGrid items={featured} primaryColor={store.primary_color} />
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div><h2 className="text-2xl font-bold">منتجات المتجر</h2><p className="text-sm text-muted-foreground mt-1">{filteredListings.length} منتج متاح</p></div>
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setActiveCategory("all")} className={`rounded-full border px-4 py-2 text-sm ${activeCategory === "all" ? "text-white" : "bg-card"}`} style={activeCategory === "all" ? { backgroundColor: store.primary_color } : undefined}>الكل</button>
                  {categories.map((category) => <button key={category.id} onClick={() => setActiveCategory(category.id)} className={`rounded-full border px-4 py-2 text-sm ${activeCategory === category.id ? "text-white" : "bg-card"}`} style={activeCategory === category.id ? { backgroundColor: store.primary_color } : undefined}>{category.name_ar}</button>)}
                </div>
              )}
            </div>

            {filteredListings.length === 0 ? (
              <div className="rounded-xl border bg-card py-16 text-center"><PackageOpen className="h-10 w-10 mx-auto text-muted-foreground" /><p className="mt-3 text-muted-foreground">لا توجد منتجات في هذا القسم.</p></div>
            ) : <ProductGrid items={filteredListings} primaryColor={store.primary_color} />}
          </div>

          {(store.shipping_policy || store.return_policy) && (
            <div className="grid md:grid-cols-2 gap-5">
              {store.shipping_policy && <div className="rounded-xl border bg-card p-5"><h3 className="font-bold">سياسة الشحن</h3><p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{store.shipping_policy}</p></div>}
              {store.return_policy && <div className="rounded-xl border bg-card p-5"><h3 className="font-bold">الاستبدال والاسترجاع</h3><p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{store.return_policy}</p></div>}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ProductGrid({ items, primaryColor }: { items: StorePayload["listings"]; primaryColor: string }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {items.map((item) => {
        const soldOut = item.track_inventory && (item.stock_quantity ?? 0) <= 0;
        return (
          <article key={item.id} className="rounded-xl border bg-card overflow-hidden group">
            <Link to="/listings/$id" params={{ id: item.id }}>
              <div className="aspect-[4/3] bg-muted overflow-hidden relative">
                {item.images?.[0] ? <img src={item.images[0]} alt={item.title_ar} className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="h-full flex items-center justify-center"><PackageOpen className="h-10 w-10 text-muted-foreground" /></div>}
                {item.is_featured && <span className="absolute top-3 right-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold flex items-center gap-1"><Star className="h-3.5 w-3.5" /> مميز</span>}
              </div>
              <div className="p-4">
                {item.category && <span className="text-xs text-muted-foreground">{item.category}</span>}
                <h3 className="font-semibold mt-1 line-clamp-2 min-h-12">{item.title_ar}</h3>
                <div className="flex items-center justify-between gap-2 mt-3">
                  <strong style={{ color: primaryColor }}>{item.price === null ? "السعر عند الطلب" : formatPrice(item.price, item.currency)}</strong>
                  {soldOut && <span className="text-xs text-destructive">نفد المخزون</span>}
                </div>
              </div>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
