import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useDeferredValue } from "react";
import { Boxes, Search, SlidersHorizontal, Wrench, Building2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { useI18n } from "@/i18n/I18nProvider";
import type { ListingType } from "@/lib/marketplace";
import {
  EGYPT_GOVERNORATES,
  getCitiesForGovernorate,
  normalizeEgyptCity,
  normalizeEgyptGovernorate,
} from "@/lib/egypt.locations";
import { supabase } from "@/integrations/supabase/client";
import { rankListings } from "@/lib/ranking";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — Souqly" },
      {
        name: "description",
        content: "Browse B2B products, services, real estate, factories and opportunities.",
      },
    ],
    links: [{ rel: "canonical", href: "https://souqlymarket.com/marketplace" }],
  }),
  component: Marketplace,
});

type MarketplaceDomain = "all" | "products" | "services" | "assets";

const DOMAIN_TYPES: Record<Exclude<MarketplaceDomain, "all">, ListingType[]> = {
  products: ["product", "market", "fish_shed"],
  services: ["service", "opportunity"],
  assets: ["real_estate", "land", "factory"],
};

const DOMAINS: { value: MarketplaceDomain; ar: string; en: string }[] = [
  { value: "all", ar: "الكل", en: "All" },
  { value: "products", ar: "المنتجات", en: "Products" },
  { value: "services", ar: "الخدمات", en: "Services" },
  { value: "assets", ar: "الأصول", en: "Assets" },
];

function Marketplace() {
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState<MarketplaceDomain>("all");
  const [governorate, setGovernorate] = useState("all");
  const [city, setCity] = useState("all");
  const [items, setItems] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    let query = supabase
      .from("listings")
      .select(
        "id, type, title_ar, title_en, images, price, currency, country, city, governorate, commission_percentage, featured, featured_until, marketer_promotion_enabled, promotion_status, leads_count, created_at, company_id, companies(name_ar, name_en, is_verified, is_premium)",
      )
      .eq("status", "approved")
      .eq("visible_in_marketplace", true)
      .neq("type", "company")
      .order("created_at", { ascending: false })
      .limit(120);
    if (domain !== "all") query = query.in("type", DOMAIN_TYPES[domain]);
    query.then(({ data }) => {
      if (cancelled) return;
      const rows = (data ?? []) as unknown as ListingCardData[];
      setItems(rankListings(rows));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [domain]);

  const cities = governorate !== "all" ? getCitiesForGovernorate(governorate) : [];

  const deferredQ = useDeferredValue(q);
  const filtered = useMemo(() => {
    const needle = deferredQ.trim().toLowerCase();
    return items.filter((l) => {
      if (domain !== "all" && !DOMAIN_TYPES[domain].includes(l.type)) return false;
      if (governorate !== "all" && normalizeEgyptGovernorate(l.governorate) !== governorate)
        return false;
      if (city !== "all" && normalizeEgyptCity(l.city) !== city) return false;
      if (!needle) return true;
      const hay =
        `${l.title_ar ?? ""} ${l.title_en ?? ""} ${l.companies?.name_ar ?? ""} ${l.companies?.name_en ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [items, deferredQ, domain, governorate, city]);

  const activeCount =
    (domain !== "all" ? 1 : 0) + (governorate !== "all" ? 1 : 0) + (city !== "all" ? 1 : 0);

  const filterBody = (
    <div className="space-y-5">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          {t("filter_type")}
        </div>
        <div className="flex flex-wrap gap-2">
          {DOMAINS.map((item) => (
            <Button
              key={item.value}
              size="sm"
              variant={domain === item.value ? "default" : "outline"}
              onClick={() => setDomain(item.value)}
              className={domain === item.value ? "bg-primary hover:bg-primary-hover" : ""}
            >
              {locale === "ar" ? item.ar : item.en}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            {t("filter_governorate")}
          </div>
          <select
            className="w-full h-12 rounded-xl border border-input bg-surface px-4 text-sm text-foreground"
            value={governorate}
            onChange={(e) => {
              setGovernorate(e.target.value);
              setCity("all");
            }}
          >
            <option value="all">{t("filter_governorate")}</option>
            {EGYPT_GOVERNORATES.map((gov) => (
              <option key={gov.value} value={gov.value}>
                {locale === "ar" ? gov.label_ar : gov.label_en}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            {t("filter_city")}
          </div>
          <select
            className="w-full h-12 rounded-xl border border-input bg-surface px-4 text-sm text-foreground"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={governorate === "all"}
          >
            <option value="all">{t("filter_city")}</option>
            {cities.map((ct) => (
              <option key={ct.value} value={ct.value}>
                {locale === "ar" ? ct.label_ar : ct.label_en}
              </option>
            ))}
          </select>
        </div>
      </div>
      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => {
            setDomain("all");
            setGovernorate("all");
            setCity("all");
          }}
        >
          <X className="h-4 w-4" /> {t("filter_all")}
        </Button>
      )}
    </div>
  );

  return (
    <PublicLayout>
      <section className="bg-surface-2 border-b border-border">
        <div className="container-souqly py-6 md:py-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-4">{t("nav_marketplace")}</h1>
          <p className="mb-5 max-w-2xl text-sm text-muted-foreground">
            {locale === "ar"
              ? "استكشف المنتجات والخدمات والأصول التجارية في مسارات واضحة. الشركات والمصانع لها أدلة مستقلة."
              : "Explore products, services and business assets in clear domains. Companies and factories have separate directories."}
          </p>
          <nav className="mb-6 grid max-w-2xl grid-cols-3 gap-2" aria-label="أقسام السوق">
            {[
              {
                icon: Boxes,
                label: locale === "ar" ? "المنتجات" : "Products",
                value: "products",
              },
              {
                icon: Wrench,
                label: locale === "ar" ? "الخدمات" : "Services",
                value: "services",
              },
              {
                icon: Building2,
                label: locale === "ar" ? "الأصول" : "Assets",
                value: "assets",
              },
            ].map(({ icon: Icon, label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => setDomain(value as MarketplaceDomain)}
                aria-pressed={domain === value}
                className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition ${
                  domain === value
                    ? "border-primary bg-primary text-primary-foreground shadow-card"
                    : "border-border bg-card text-foreground hover:border-accent/50 hover:bg-accent/5"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </nav>

          {/* Search + mobile filter trigger */}
          <div className="flex items-center gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute start-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("search_placeholder")}
                className="ps-11 h-12 bg-surface"
              />
            </div>
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="lg" className="lg:hidden h-12 shrink-0 relative">
                  <SlidersHorizontal className="h-4 w-4" />
                  {activeCount > 0 && (
                    <span className="absolute -top-1 -end-1 h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center px-1">
                      {activeCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>{t("filter_type")}</SheetTitle>
                </SheetHeader>
                <div className="mt-4">{filterBody}</div>
                <Button
                  className="w-full mt-6 bg-primary hover:bg-primary-hover"
                  onClick={() => setFiltersOpen(false)}
                >
                  {t("view_all")} ({filtered.length})
                </Button>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop inline filters */}
          <div className="mt-6 hidden rounded-xl border border-border bg-card p-5 shadow-card lg:block">
            {filterBody}
          </div>
        </div>
      </section>

      <section className="container-souqly py-6 md:py-8 flex-1">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-card"
              >
                <Skeleton className="h-32 md:h-40 w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={items.length === 0 ? t("no_listings_yet") : t("no_results")}
            cta={items.length === 0 ? { label: t("be_the_first"), to: "/listings/new" } : undefined}
          />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
            {filtered.map((l) => (
              <ListingCard key={l.id} l={l} />
            ))}
          </div>
        )}
        <p className="mt-6 text-xs text-muted-foreground">
          {filtered.length} {t("listings_count")} • {locale.toUpperCase()}
        </p>
      </section>
    </PublicLayout>
  );
}

function EmptyState({ title, cta }: { title: string; cta?: { label: string; to: string } }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center shadow-card">
      <div className="text-lg font-semibold mb-2">{title}</div>
      {cta && (
        <Button asChild className="mt-4 bg-primary hover:bg-primary-hover">
          <Link to={cta.to}>{cta.label}</Link>
        </Button>
      )}
    </div>
  );
}
