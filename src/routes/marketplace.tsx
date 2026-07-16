import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useDeferredValue } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { useI18n } from "@/i18n/I18nProvider";
import { LISTING_TYPES, type ListingType } from "@/lib/marketplace";
import { EGYPT_GOVERNORATES, getCitiesForGovernorate, normalizeEgyptCity, normalizeEgyptGovernorate } from "@/lib/egypt.locations";
import { supabase } from "@/integrations/supabase/client";
import { rankListings } from "@/lib/ranking";

export const Route = createFileRoute("/marketplace")({
  head: () => ({ meta: [{ title: "Marketplace — Souqly" }, { name: "description", content: "Browse B2B products, services, real estate, factories and opportunities." }] }),
  component: Marketplace,
});

const TYPES: { value: ListingType | "all"; key: string }[] = [
  { value: "all", key: "filter_all" },
  ...LISTING_TYPES.map((t) => ({ value: t, key: `cat_${t}` })),
];

function Marketplace() {
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const [type, setType] = useState<ListingType | "all">("all");
  const [governorate, setGovernorate] = useState("all");
  const [city, setCity] = useState("all");
  const [items, setItems] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const nowIso = new Date().toISOString();
    let query = supabase
      .from("listings")
      .select("id, type, title_ar, title_en, images, price, currency, country, city, governorate, commission_percentage, featured, featured_until, marketer_promotion_enabled, promotion_status, leads_count, created_at, company_id, companies(name_ar, name_en, is_verified, is_premium)")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(120);
    if (type !== "all") query = query.eq("type", type);
    query.then(({ data }) => {
      if (cancelled) return;
      const rows = (data ?? []) as unknown as ListingCardData[];
      setItems(rankListings(rows));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [type]);

  const cities = governorate !== "all" ? getCitiesForGovernorate(governorate) : [];

  const deferredQ = useDeferredValue(q);
  const filtered = useMemo(() => {
    const needle = deferredQ.trim().toLowerCase();
    return items.filter((l) => {
      if (type !== "all" && l.type !== type) return false;
      if (governorate !== "all" && normalizeEgyptGovernorate(l.governorate) !== governorate) return false;
      if (city !== "all" && normalizeEgyptCity(l.city) !== city) return false;
      if (!needle) return true;
      const hay = `${l.title_ar ?? ""} ${l.title_en ?? ""} ${l.companies?.name_ar ?? ""} ${l.companies?.name_en ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [items, deferredQ, type, governorate, city]);

  const activeCount = (type !== "all" ? 1 : 0) + (governorate !== "all" ? 1 : 0) + (city !== "all" ? 1 : 0);

  const filterBody = (
    <div className="space-y-5">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t("filter_type")}</div>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((tp) => (
            <Button key={tp.value} size="sm" variant={type === tp.value ? "default" : "outline"}
              onClick={() => setType(tp.value)}
              className={type === tp.value ? "bg-primary hover:bg-primary-hover" : ""}>
              {t(tp.key as never)}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t("filter_governorate")}</div>
          <select
            className="w-full h-12 rounded-xl border border-input bg-surface px-4 text-sm text-foreground"
            value={governorate}
            onChange={(e) => { setGovernorate(e.target.value); setCity("all"); }}
          >
            <option value="all">{t("filter_governorate")}</option>
            {EGYPT_GOVERNORATES.map((gov) => (
              <option key={gov.value} value={gov.value}>{locale === "ar" ? gov.label_ar : gov.label_en}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t("filter_city")}</div>
          <select
            className="w-full h-12 rounded-xl border border-input bg-surface px-4 text-sm text-foreground"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={governorate === "all"}
          >
            <option value="all">{t("filter_city")}</option>
            {cities.map((ct) => (
              <option key={ct.value} value={ct.value}>{locale === "ar" ? ct.label_ar : ct.label_en}</option>
            ))}
          </select>
        </div>
      </div>
      {activeCount > 0 && (
        <Button variant="ghost" size="sm" className="text-muted-foreground"
          onClick={() => { setType("all"); setGovernorate("all"); setCity("all"); }}>
          <X className="h-4 w-4" /> {t("filter_all")}
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="bg-surface-2 border-b border-border">
        <div className="container-souqly py-6 md:py-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-4">{t("nav_marketplace")}</h1>

          {/* Search + mobile filter trigger */}
          <div className="flex items-center gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute start-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search_placeholder")} className="ps-11 h-12 bg-surface" />
            </div>
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="lg" className="lg:hidden h-12 shrink-0 relative">
                  <SlidersHorizontal className="h-4 w-4" />
                  {activeCount > 0 && (
                    <span className="absolute -top-1 -end-1 h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center px-1">{activeCount}</span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{t("filter_type")}</SheetTitle>
                </SheetHeader>
                <div className="mt-4">{filterBody}</div>
                <Button className="w-full mt-6 bg-primary hover:bg-primary-hover" onClick={() => setFiltersOpen(false)}>
                  {t("view_all")} ({filtered.length})
                </Button>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop inline filters */}
          <div className="hidden lg:block mt-6 rounded-2xl border border-white/10 bg-surface p-5">
            {filterBody}
          </div>
        </div>
      </section>

      <section className="container-souqly py-6 md:py-8 flex-1">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-3 space-y-3">
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
            {filtered.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        )}
        <p className="mt-6 text-xs text-muted-foreground">{filtered.length} {t("listings_count")} • {locale.toUpperCase()}</p>
      </section>
      <SiteFooter />
    </div>
  );
}

function EmptyState({ title, cta }: { title: string; cta?: { label: string; to: string } }) {
  return (
    <div className="py-24 text-center">
      <div className="text-lg font-semibold mb-2">{title}</div>
      {cta && (
        <Button asChild className="mt-4 bg-primary hover:bg-primary-hover">
          <Link to={cta.to}>{cta.label}</Link>
        </Button>
      )}
    </div>
  );
}

