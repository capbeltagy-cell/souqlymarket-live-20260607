import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/i18n/I18nProvider";
import { listPublicStores } from "@/lib/stores.functions";
import { BadgeCheck, Store as StoreIcon } from "lucide-react";

export const Route = createFileRoute("/stores/")({
  head: () => ({
    meta: [
      { title: "المتاجر — سوقلي" },
      { name: "description", content: "استعرض متاجر التجار والشركات الموثوقة على سوقلي." },
      { property: "og:title", content: "متاجر سوقلي" },
      { property: "og:description", content: "متاجر مصرية معتمدة، ادفع واستلم من داخل المنصة." },
    ],
  }),
  component: StoresPage,
});

function StoresPage() {
  const { locale } = useI18n();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    listPublicStores()
      .then((r) => {
        setItems(r.items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);
  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <section className="container-souqly py-10">
        <h1 className="text-3xl font-bold mb-6">{locale === "ar" ? "المتاجر" : "Stores"}</h1>
        {loading ? (
          <div className="text-muted-foreground">…</div>
        ) : items.length === 0 ? (
          <div className="text-muted-foreground">
            {locale === "ar" ? "لا توجد متاجر منشورة حاليًا" : "No published stores yet"}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((s) => (
              <Link
                key={s.id}
                to="/stores/$slug"
                params={{ slug: s.slug }}
                className="group rounded-xl overflow-hidden border border-border bg-card hover:shadow-lg transition"
              >
                <div className="aspect-[3/1] bg-muted relative">
                  {s.banner_url ? (
                    <img src={s.banner_url} alt="" className="h-full w-full object-cover" />
                  ) : null}
                  {s.logo_url ? (
                    <img
                      src={s.logo_url}
                      alt=""
                      className="absolute -bottom-6 start-4 h-14 w-14 rounded-full border-4 border-card object-cover bg-white"
                    />
                  ) : (
                    <div className="absolute -bottom-6 start-4 h-14 w-14 rounded-full border-4 border-card grid place-items-center bg-primary text-primary-foreground">
                      <StoreIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="p-4 pt-8">
                  <div className="flex items-center gap-1.5">
                    <div className="font-semibold">
                      {locale === "ar" ? s.name_ar : (s.name_en ?? s.name_ar)}
                    </div>
                    {s.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {[s.governorate, s.city].filter(Boolean).join(" • ")}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {s.products_count} {locale === "ar" ? "منتج" : "products"} • ⭐{" "}
                    {Number(s.review_avg || 0).toFixed(1)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
