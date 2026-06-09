import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MapView } from "@/components/MapView";
import { useI18n } from "@/i18n/I18nProvider";
import { LISTING_TYPES, type ListingType } from "@/lib/marketplace";
import { EGYPT_GOVERNORATES, getCitiesForGovernorate, normalizeEgyptCity, normalizeEgyptGovernorate, translateEgyptCity, translateEgyptGovernorate } from "@/lib/egypt.locations";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/currency";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [
    { title: "Map — Souqly" },
    { name: "description", content: "Browse real estate, lands, factories and warehouses on the map across Egypt." },
  ] }),
  component: MapPage,
});

type ListingMarker = {
  id: string;
  type: ListingType;
  title_ar: string | null;
  title_en: string | null;
  country: string | null;
  governorate: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

const TYPES: { value: ListingType | "all"; key: string }[] = [
  { value: "all", key: "filter_all" },
  ...LISTING_TYPES.map((t) => ({ value: t, key: `cat_${t}` })),
];

function MapPage() {
  const { t, locale } = useI18n();
  const [listings, setListings] = useState<ListingMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<ListingType | "all">("all");
  const [governorate, setGovernorate] = useState("all");
  const [city, setCity] = useState("all");

  useEffect(() => {
    setLoading(true);
    supabase
      .from("listings")
      .select("id, type, title_ar, title_en, country, governorate, city, latitude, longitude")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setListings((data ?? []) as ListingMarker[]);
        setLoading(false);
      });
  }, []);

  const governorates = useMemo(
    () => EGYPT_GOVERNORATES.map((gov) => gov.value),
    [],
  );

  const cities = useMemo(
    () => (governorate !== "all" ? getCitiesForGovernorate(governorate) : []),
    [governorate],
  );

  const filtered = useMemo(
    () => listings.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (governorate !== "all" && normalizeEgyptGovernorate(item.governorate) !== governorate) return false;
      if (city !== "all" && normalizeEgyptCity(item.city) !== city) return false;
      return item.latitude !== null && item.longitude !== null;
    }),
    [city, governorate, listings, typeFilter],
  );

  const markers = filtered.map((item) => ({
    id: item.id,
    lat: item.latitude ?? 0,
    lng: item.longitude ?? 0,
    type: item.type,
    title: locale === "ar" ? item.title_ar ?? item.title_en ?? "" : item.title_en ?? item.title_ar ?? "",
    description: [item.city, item.governorate, item.country].filter(Boolean).join(" · "),
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="bg-surface-2 border-b border-border">
        <div className="container-souqly py-10">
          <h1 className="text-3xl font-bold mb-4">{t("map_page_title")}</h1>
          <p className="text-muted-foreground max-w-2xl">{t("map_page_description")}</p>
        </div>
      </section>
      <section className="container-souqly py-8 flex-1">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  className="h-12 w-full rounded-md border border-input bg-background ps-10 pe-3"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as ListingType | "all")}
                >
                  {TYPES.map((tp) => (
                    <option key={tp.value} value={tp.value}>{t(tp.key as never)}</option>
                  ))}
                </select>
              </div>
              <select
                className="h-12 rounded-md border border-input bg-background px-3"
                value={governorate}
                onChange={(e) => {
                  setGovernorate(e.target.value);
                  setCity("all");
                }}
              >
                <option value="all">{t("filter_governorate")}</option>
                {EGYPT_GOVERNORATES.map((gov) => (
                  <option key={gov.value} value={gov.value}>{locale === "ar" ? gov.label_ar : gov.label_en}</option>
                ))}
              </select>
              <select
                className="h-12 rounded-md border border-input bg-background px-3"
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
            <div className="mt-6">
              {loading ? (
                <div className="py-20 text-center text-muted-foreground">{t("loading")}</div>
              ) : filtered.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground">{t("no_results")}</div>
              ) : (
                <MapView markers={markers} />
              )}
            </div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <h2 className="text-lg font-semibold mb-3">{t("map_summary_title")}</h2>
              <p className="text-sm text-muted-foreground">{filtered.length} {t("listings_count")}</p>
              <Button asChild className="mt-4 w-full bg-primary hover:bg-primary-hover">
                <Link to="/marketplace">{t("nav_marketplace")}</Link>
              </Button>
            </div>
          </aside>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
