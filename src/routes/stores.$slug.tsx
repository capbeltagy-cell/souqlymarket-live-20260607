import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/i18n/I18nProvider";
import { getStoreBySlug, followStore } from "@/lib/stores.functions";
import { BadgeCheck, Store as StoreIcon, Heart } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/currency";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { addToCart } from "@/lib/cart";

export const Route = createFileRoute("/stores/$slug")({
  loader: async ({ params }) => {
    const res = await getStoreBySlug({ data: { slug: params.slug } });
    if (!res.store) throw notFound();
    return res;
  },
  head: ({ loaderData }) => {
    if (!loaderData?.store) return { meta: [{ title: "المتجر غير موجود" }, { name: "robots", content: "noindex" }] };
    const s: any = loaderData.store;
    const title = `${s.name_ar} — سوقلي`;
    const desc = (s.description_ar || `تسوق من متجر ${s.name_ar} على سوقلي`).slice(0, 158);
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(s.banner_url || s.logo_url ? [{ property: "og:image", content: s.banner_url || s.logo_url }] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center"><div>المتجر غير موجود</div></div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center text-destructive">{error.message}</div>
  ),
  component: StorePage,
});

function StorePage() {
  const { store, categories, listings, reviews } = Route.useLoaderData() as any;
  const { locale } = useI18n();
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const filtered = activeCat ? listings.filter((l: any) => l.store_category_id === activeCat) : listings;

  async function toggleFollow() {
    if (!user) { toast.error("سجّل الدخول أولًا"); return; }
    const next = !following;
    setFollowing(next);
    try {
      await followStore({ data: { store_id: store.id, follow: next } });
      toast.success(next ? "تمت المتابعة" : "تم إلغاء المتابعة");
    } catch (e: any) {
      setFollowing(!next);
      toast.error(e.message);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="relative aspect-[4/1] max-h-64 bg-gradient-to-br from-primary/30 to-primary/10">
        {store.banner_url && <img src={store.banner_url} alt="" className="w-full h-full object-cover" />}
      </div>
      <section className="container-souqly -mt-12 relative z-10">
        <div className="rounded-2xl bg-card border border-border p-5 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="h-20 w-20 rounded-full border-4 border-card overflow-hidden bg-white grid place-items-center shrink-0">
            {store.logo_url ? <img src={store.logo_url} className="h-full w-full object-cover" alt="" /> : <StoreIcon className="h-8 w-8 text-muted-foreground" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{locale === "ar" ? store.name_ar : (store.name_en ?? store.name_ar)}</h1>
              {store.is_verified && <BadgeCheck className="h-5 w-5 text-primary" />}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {[store.governorate, store.city].filter(Boolean).join(" • ")}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              ⭐ {Number(store.review_avg || 0).toFixed(1)} ({store.review_count}) • {store.followers_count} متابع
            </div>
          </div>
          <Button onClick={toggleFollow} variant={following ? "outline" : "default"}>
            <Heart className={`h-4 w-4 me-1 ${following ? "fill-current" : ""}`} />
            {following ? "متابع" : "متابعة"}
          </Button>
        </div>

        {store.description_ar && (
          <div className="mt-4 rounded-xl bg-card border border-border p-4 text-sm">{store.description_ar}</div>
        )}

        {categories.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            <button onClick={() => setActiveCat(null)} className={`px-3 py-1.5 rounded-full text-sm border ${!activeCat ? "bg-primary text-primary-foreground" : "bg-card"}`}>الكل</button>
            {categories.map((c: any) => (
              <button key={c.id} onClick={() => setActiveCat(c.id)} className={`px-3 py-1.5 rounded-full text-sm border shrink-0 ${activeCat === c.id ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                {locale === "ar" ? c.name_ar : (c.name_en ?? c.name_ar)}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <div className="text-muted-foreground col-span-full">لا توجد منتجات</div>
          ) : filtered.map((l: any) => (
            <div key={l.id} className="rounded-xl border border-border bg-card overflow-hidden group">
              <Link to="/listings/$id" params={{ id: l.id }}>
                <div className="aspect-square bg-muted">
                  {l.images?.[0] && <img src={l.images[0]} className="h-full w-full object-cover group-hover:scale-105 transition" alt="" />}
                </div>
                <div className="p-3">
                  <div className="text-sm font-medium line-clamp-2">{locale === "ar" ? l.title_ar : (l.title_en ?? l.title_ar)}</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <div className="font-bold text-primary">{formatPrice(l.sale_price ?? l.price, locale)}</div>
                    {l.sale_price && l.sale_price < l.price ? (
                      <div className="text-xs text-muted-foreground line-through">{formatPrice(l.price, locale)}</div>
                    ) : null}
                  </div>
                </div>
              </Link>
              <div className="px-3 pb-3">
                <Button size="sm" className="w-full" onClick={() => {
                  addToCart({
                    listing_id: l.id,
                    company_id: null,
                    company_name: store.name_ar,
                    title: locale === "ar" ? l.title_ar : (l.title_en ?? l.title_ar),
                    image: l.images?.[0] ?? null,
                    price: Number(l.sale_price ?? l.price),
                    currency: l.currency ?? "EGP",
                  });
                  toast.success("أُضيف للسلة");
                }}>إضافة للسلة</Button>
              </div>
            </div>
          ))}
        </div>

        {reviews.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-3">التقييمات</h2>
            <div className="space-y-3">
              {reviews.slice(0, 10).map((r: any) => (
                <div key={r.id} className="rounded-xl bg-card border border-border p-4">
                  <div className="text-sm font-medium">⭐ {r.rating}</div>
                  {r.body && <p className="mt-1 text-sm">{r.body}</p>}
                  {r.seller_reply && <p className="mt-2 text-xs text-muted-foreground border-s-2 border-primary ps-3">رد المتجر: {r.seller_reply}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {(store.shipping_policy || store.return_policy) && (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {store.shipping_policy && <div className="rounded-xl bg-card border border-border p-4"><h3 className="font-semibold mb-1">سياسة الشحن</h3><p className="text-sm text-muted-foreground whitespace-pre-wrap">{store.shipping_policy}</p></div>}
            {store.return_policy && <div className="rounded-xl bg-card border border-border p-4"><h3 className="font-semibold mb-1">الاستبدال والاسترجاع</h3><p className="text-sm text-muted-foreground whitespace-pre-wrap">{store.return_policy}</p></div>}
          </div>
        )}

        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Store",
            name: store.name_ar,
            description: store.description_ar,
            address: [store.governorate, store.city].filter(Boolean).join(", "),
            aggregateRating: store.review_count > 0 ? {
              "@type": "AggregateRating",
              ratingValue: store.review_avg,
              reviewCount: store.review_count,
            } : undefined,
          }),
        }} />
      </section>
      <SiteFooter />
    </div>
  );
}
