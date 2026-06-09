import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { EGYPT_GOVERNORATES, getCitiesForGovernorate, normalizeEgyptGovernorate, normalizeEgyptCity } from "@/lib/egypt.locations";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/currency";
import { MapPin, Ruler } from "lucide-react";

export type PropertySubtype = { value: string; label_en: string; label_ar: string };

type Props = {
  listingType: "real_estate" | "land";
  subtypes: PropertySubtype[];
  titleAr: string;
  titleEn: string;
};

type Row = ListingCardData & { area_sqm?: number | null; property_subtype?: string | null; purpose?: string | null };

export function PropertyBrowser({ listingType, subtypes, titleAr, titleEn }: Props) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [subtype, setSubtype] = useState<string>("all");
  const [purposeFilter, setPurposeFilter] = useState<"all" | "sale" | "rent">("all");
  const [governorate, setGovernorate] = useState("all");
  const [city, setCity] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minArea, setMinArea] = useState("");

  useEffect(() => {
    setLoading(true);
    supabase.from("listings")
      .select("id, type, title_ar, title_en, images, price, currency, country, city, governorate, area_sqm, property_subtype, purpose, commission_percentage, featured, featured_until, company_id, companies(name_ar, name_en, phone, is_verified)")
      .eq("type", listingType)
      .eq("status", "approved")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => { setRows((data ?? []) as any); setLoading(false); });
  }, [listingType]);

  const cities = governorate !== "all" ? getCitiesForGovernorate(governorate) : [];

  const filtered = useMemo(() => rows.filter((r) => {
    if (subtype !== "all" && (r.property_subtype ?? "") !== subtype) return false;
    if (purposeFilter !== "all" && (r.purpose ?? "") !== purposeFilter) return false;
    if (governorate !== "all" && normalizeEgyptGovernorate(r.governorate ?? null) !== governorate) return false;
    if (city !== "all" && normalizeEgyptCity(r.city ?? null) !== city) return false;
    if (minPrice && (Number(r.price) || 0) < Number(minPrice)) return false;
    if (maxPrice && (Number(r.price) || 0) > Number(maxPrice)) return false;
    if (minArea && (Number(r.area_sqm) || 0) < Number(minArea)) return false;
    return true;
  }), [rows, subtype, purposeFilter, governorate, city, minPrice, maxPrice, minArea]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">
        <h1 className="text-3xl font-bold mb-2">{ar ? titleAr : titleEn}</h1>
        <p className="text-muted-foreground mb-6">{ar ? "تصفح حسب النوع والمحافظة والسعر والمساحة" : "Browse by type, governorate, price and area"}</p>

        <div className="flex flex-wrap gap-2 mb-6">
          <Button size="sm" variant={subtype === "all" ? "default" : "outline"} onClick={() => setSubtype("all")}>
            {ar ? "الكل" : "All"}
          </Button>
          {subtypes.map((s) => (
            <Button key={s.value} size="sm" variant={subtype === s.value ? "default" : "outline"} onClick={() => setSubtype(s.value)}>
              {ar ? s.label_ar : s.label_en}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6 p-4 rounded-lg border border-border bg-card">
          <select value={governorate} onChange={(e) => { setGovernorate(e.target.value); setCity("all"); }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm col-span-2">
            <option value="all">{ar ? "كل المحافظات" : "All governorates"}</option>
            {EGYPT_GOVERNORATES.map((g) => <option key={g.value} value={g.value}>{ar ? g.label_ar : g.label_en}</option>)}
          </select>
          <select value={city} onChange={(e) => setCity(e.target.value)} disabled={governorate === "all"}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm col-span-2">
            <option value="all">{ar ? "كل المدن" : "All cities"}</option>
            {cities.map((c) => <option key={c.value} value={c.value}>{ar ? c.label_ar : c.label_en}</option>)}
          </select>
          <Input placeholder={ar ? "أدنى سعر" : "Min price"} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} type="number" />
          <Input placeholder={ar ? "أقصى سعر" : "Max price"} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} type="number" />
          <Input placeholder={ar ? "أدنى مساحة (م²)" : "Min area (m²)"} value={minArea} onChange={(e) => setMinArea(e.target.value)} type="number" className="col-span-2" />
        </div>

        {loading ? (
          <p className="text-muted-foreground">{ar ? "جاري التحميل..." : "Loading..."}</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
            {ar ? "لا توجد عقارات مطابقة" : "No matching properties"}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((r) => (
              <div key={r.id} className="space-y-2">
                <ListingCard l={r} />
                {(r.area_sqm || r.property_subtype) && (
                  <div className="px-2 flex items-center gap-3 text-xs text-muted-foreground">
                    {r.property_subtype && (
                      <Badge variant="secondary" className="text-[10px]">
                        {subtypes.find((s) => s.value === r.property_subtype)
                          ? (ar ? subtypes.find((s) => s.value === r.property_subtype)!.label_ar : subtypes.find((s) => s.value === r.property_subtype)!.label_en)
                          : r.property_subtype}
                      </Badge>
                    )}
                    {r.area_sqm && (
                      <span className="inline-flex items-center gap-1"><Ruler className="h-3 w-3" />{Number(r.area_sqm).toLocaleString(ar ? "ar-EG" : "en-US")} م²</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

export const REAL_ESTATE_SUBTYPES: PropertySubtype[] = [
  { value: "apartment", label_en: "Apartments", label_ar: "شقق" },
  { value: "villa", label_en: "Villas", label_ar: "فيلات" },
  { value: "shop", label_en: "Shops", label_ar: "محلات" },
  { value: "office", label_en: "Offices", label_ar: "مكاتب" },
  { value: "warehouse", label_en: "Warehouses", label_ar: "مخازن" },
];

export const LAND_SUBTYPES: PropertySubtype[] = [
  { value: "agricultural", label_en: "Agricultural", label_ar: "زراعية" },
  { value: "industrial", label_en: "Industrial", label_ar: "صناعية" },
  { value: "investment", label_en: "Investment", label_ar: "استثمارية" },
  { value: "building", label_en: "Building", label_ar: "بناء" },
];

// suppress unused
void formatPrice; void MapPin;
