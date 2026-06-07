import { Link } from "@tanstack/react-router";
import { MapPin, TrendingUp, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import type { ListingType } from "@/lib/marketplace";

export type ListingCardData = {
  id: string;
  type: ListingType;
  title_ar: string | null;
  title_en: string | null;
  images: string[] | null;
  price: number | null;
  currency: string | null;
  country: string | null;
  commission_percentage: number | null;
  featured?: boolean | null;
  company_id?: string | null;
  companies?: { name_ar: string | null; name_en: string | null } | null;
};

const typeKey: Record<ListingType, string> = {
  product: "cat_product",
  service: "cat_service",
  real_estate: "cat_real_estate",
  land: "cat_land",
  factory: "cat_factory",
  opportunity: "cat_opportunity",
};

const placeholder = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'><rect width='4' height='3' fill='%23e2e8f0'/></svg>";

export function ListingCard({ l }: { l: ListingCardData }) {
  const { t, locale } = useI18n();
  const title = (locale === "ar" ? l.title_ar : l.title_en) ?? l.title_en ?? l.title_ar ?? "";
  const company = (locale === "ar" ? l.companies?.name_ar : l.companies?.name_en) ?? l.companies?.name_en ?? l.companies?.name_ar ?? "";
  const image = l.images?.[0] ?? placeholder;
  return (
    <div className="group overflow-hidden rounded-lg border border-border bg-card shadow-card hover:shadow-elev transition-all">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img src={image} alt={title} loading="lazy"
          className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        <Badge className="absolute top-3 start-3 bg-surface/95 text-foreground hover:bg-surface">
          {t(typeKey[l.type] as never)}
        </Badge>
        {l.featured && (
          <Badge className="absolute top-3 end-3 bg-accent text-accent-foreground hover:bg-accent">★</Badge>
        )}
        <button className="absolute bottom-3 end-3 h-9 w-9 rounded-full bg-surface/95 grid place-items-center hover:bg-surface transition">
          <Heart className="h-4 w-4" />
        </button>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">{title}</h3>
          {company && <p className="text-xs text-muted-foreground mt-1">{t("by_company")} {company}</p>}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3" />{l.country ?? "—"}
          </span>
          <span className="flex items-center gap-1 text-success font-medium">
            <TrendingUp className="h-3 w-3" />{t("commission")} {l.commission_percentage ?? 0}%
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            {l.price && l.price > 0 ? (
              <div className="font-bold text-primary text-lg">{l.currency ?? "USD"} {l.price.toLocaleString()}</div>
            ) : (
              <div className="text-xs text-muted-foreground">—</div>
            )}
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/listings/$id" params={{ id: l.id }}>{t("view_details")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
