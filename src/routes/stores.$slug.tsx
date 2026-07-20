import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/i18n/I18nProvider";
import { getStoreBySlug, followStore } from "@/lib/stores.functions";
import {
  BadgeCheck,
  Store as StoreIcon,
  Heart,
  PackageSearch,
  RotateCcw,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/currency";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { addToCart } from "@/lib/cart";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type StoreCategory = { id: string; name_ar: string; name_en: string | null };
type StoreReview = { id: string; rating: number; body: string | null; seller_reply: string | null };
type StoreListing = {
  id: string;
  title_ar: string | null;
  title_en: string | null;
  price: number | null;
  sale_price: number | null;
  currency: string | null;
  images: string[] | null;
  store_category_id: string | null;
};

export const Route = createFileRoute("/stores/$slug")({
  loader: async ({ params }) => {
    const res = await getStoreBySlug({ data: { slug: params.slug } });
    if (!res.store) throw notFound();
    return res;
  },
  head: ({ loaderData }) => {
    if (!loaderData?.store)
      return { meta: [{ title: "المتجر غير موجود" }, { name: "robots", content: "noindex" }] };
    const s = loaderData.store;
    const title = `${s.name_ar} — سوقلي`;
    const desc = (s.description_ar || `تسوق من متجر ${s.name_ar} على سوقلي`).slice(0, 158);
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(s.banner_url || s.logo_url
          ? [{ property: "og:image", content: s.banner_url || s.logo_url }]
          : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div>المتجر غير موجود</div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center text-destructive">
      {error.message}
    </div>
  ),
  component: StorePage,
});

function StorePage() {
  const { store, categories, listings, reviews } = Route.useLoaderData();
  const { locale } = useI18n();
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const storeListings = listings as StoreListing[];
  const filtered = activeCat
    ? storeListings.filter((listing) => listing.store_category_id === activeCat)
    : storeListings;

  async function toggleFollow() {
    if (!user) {
      toast.error("سجّل الدخول أولًا");
      return;
    }
    const next = !following;
    setFollowing(next);
    try {
      await followStore({ data: { store_id: store.id, follow: next } });
      toast.success(next ? "أنت تتابع المتجر الآن" : "تم إلغاء متابعة المتجر", { duration: 2200 });
    } catch (e: unknown) {
      setFollowing(!next);
      toast.error(e instanceof Error ? e.message : "تعذر تحديث المتابعة");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="relative h-36 sm:h-48 lg:h-56 bg-gradient-to-br from-primary/30 to-primary/10 overflow-hidden">
        {store.banner_url && (
          <img
            src={store.banner_url}
            alt={`غلاف ${store.name_ar}`}
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
      </div>
      <section className="container-souqly -mt-9 sm:-mt-12 relative z-10 pb-10">
        <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-4 border-card overflow-hidden bg-white grid place-items-center shrink-0 shadow-sm">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                className="h-full w-full object-cover"
                alt={`شعار ${store.name_ar}`}
                loading="eager"
              />
            ) : (
              <StoreIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {locale === "ar" ? store.name_ar : (store.name_en ?? store.name_ar)}
              </h1>
              {store.is_verified && <BadgeCheck className="h-5 w-5 text-primary" />}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {[store.governorate, store.city].filter(Boolean).join(" • ")}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              ⭐ {Number(store.review_avg || 0).toFixed(1)} ({store.review_count}) •{" "}
              {store.followers_count} متابع
            </div>
          </div>
          <Button
            onClick={toggleFollow}
            variant={following ? "outline" : "default"}
            className="w-full sm:w-auto min-w-28 rounded-full"
          >
            <Heart className={`h-4 w-4 me-1 ${following ? "fill-current" : ""}`} />
            {following ? "متابع" : "متابعة"}
          </Button>
        </div>

        {store.description_ar && (
          <div className="mt-4 rounded-xl bg-card border border-border p-4 sm:p-5">
            <h2 className="font-semibold mb-2">عن المتجر</h2>
            <p className="text-sm leading-7 text-muted-foreground whitespace-pre-line">
              {locale === "ar"
                ? store.description_ar
                : (store.description_en ?? store.description_ar)}
            </p>
          </div>
        )}

        {categories.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveCat(null)}
              className={`px-3 py-1.5 rounded-full text-sm border ${!activeCat ? "bg-primary text-primary-foreground" : "bg-card"}`}
            >
              الكل
            </button>
            {(categories as StoreCategory[]).map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={`px-3 py-1.5 rounded-full text-sm border shrink-0 ${activeCat === c.id ? "bg-primary text-primary-foreground" : "bg-card"}`}
              >
                {locale === "ar" ? c.name_ar : (c.name_en ?? c.name_ar)}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                <PackageSearch className="h-6 w-6" />
              </div>
              <h2 className="font-semibold">
                {activeCat ? "لا توجد منتجات في هذا القسم" : "المتجر يجهّز منتجاته"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeCat
                  ? "جرّب اختيار قسم آخر أو عرض كل المنتجات."
                  : "تابع المتجر ليصلك كل جديد عند إضافة المنتجات."}
              </p>
              {activeCat && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setActiveCat(null)}
                >
                  عرض كل المنتجات
                </Button>
              )}
            </div>
          ) : (
            filtered.map((l) => (
              <article
                key={l.id}
                className="rounded-xl border border-border bg-card overflow-hidden group flex flex-col min-w-0"
              >
                <Link to="/listings/$id" params={{ id: l.id }}>
                  <div className="aspect-square bg-muted">
                    {l.images?.[0] && (
                      <img
                        src={l.images[0]}
                        className="h-full w-full object-cover group-hover:scale-105 transition"
                        alt={(locale === "ar" ? l.title_ar : (l.title_en ?? l.title_ar)) ?? "منتج"}
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-medium line-clamp-2">
                      {locale === "ar" ? l.title_ar : (l.title_en ?? l.title_ar)}
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <div className="font-bold text-primary">
                        {formatPrice(l.sale_price ?? l.price, locale)}
                      </div>
                      {l.sale_price && l.sale_price < Number(l.price) ? (
                        <div className="text-xs text-muted-foreground line-through">
                          {formatPrice(l.price, locale)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Link>
                <div className="px-3 pb-3 mt-auto">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      addToCart({
                        listing_id: l.id,
                        company_id: null,
                        company_name: store.name_ar,
                        title:
                          (locale === "ar" ? l.title_ar : (l.title_en ?? l.title_ar)) ?? "منتج",
                        image: l.images?.[0] ?? null,
                        price: Number(l.sale_price ?? l.price),
                        currency: l.currency ?? "EGP",
                      });
                      toast.success("أُضيف للسلة");
                    }}
                  >
                    إضافة للسلة
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>

        {reviews.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-3">التقييمات</h2>
            <div className="space-y-3">
              {(reviews as StoreReview[]).slice(0, 10).map((r) => (
                <div key={r.id} className="rounded-xl bg-card border border-border p-4">
                  <div className="text-sm font-medium">⭐ {r.rating}</div>
                  {r.body && <p className="mt-1 text-sm">{r.body}</p>}
                  {r.seller_reply && (
                    <p className="mt-2 text-xs text-muted-foreground border-s-2 border-primary ps-3">
                      رد المتجر: {r.seller_reply}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(store.shipping_policy?.trim() || store.return_policy?.trim()) && (
          <Accordion
            type="single"
            collapsible
            className="mt-8 rounded-xl border border-border bg-card px-4"
          >
            {store.shipping_policy?.trim() && (
              <AccordionItem value="shipping">
                <AccordionTrigger className="text-sm">
                  <span className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    سياسة الشحن
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-7 text-muted-foreground whitespace-pre-wrap">
                  {store.shipping_policy}
                </AccordionContent>
              </AccordionItem>
            )}
            {store.return_policy?.trim() && (
              <AccordionItem value="returns">
                <AccordionTrigger className="text-sm">
                  <span className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-primary" />
                    الاستبدال والاسترجاع
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-7 text-muted-foreground whitespace-pre-wrap">
                  {store.return_policy}
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        )}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Store",
              name: store.name_ar,
              description: store.description_ar,
              address: [store.governorate, store.city].filter(Boolean).join(", "),
              aggregateRating:
                store.review_count > 0
                  ? {
                      "@type": "AggregateRating",
                      ratingValue: store.review_avg,
                      reviewCount: store.review_count,
                    }
                  : undefined,
            }),
          }}
        />
      </section>
      <SiteFooter />
    </div>
  );
}
