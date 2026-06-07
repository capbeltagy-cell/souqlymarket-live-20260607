import { Link } from "@tanstack/react-router";
import { MapPin, TrendingUp, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { listingCompany, listingCountry, listingTitle, type SampleListing } from "@/lib/sampleData";

const typeLabel: Record<SampleListing["type"], { key: string }> = {
  product: { key: "cat_product" },
  service: { key: "cat_service" },
  real_estate: { key: "cat_real_estate" },
  land: { key: "cat_land" },
  factory: { key: "cat_factory" },
  opportunity: { key: "cat_opportunity" },
};

export function ListingCard({ l }: { l: SampleListing }) {
  const { t, locale } = useI18n();
  return (
    <div className="group overflow-hidden rounded-lg border border-border bg-card shadow-card hover:shadow-elev transition-all">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img src={l.image} alt={listingTitle(l, locale)} loading="lazy"
          className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        <Badge className="absolute top-3 start-3 bg-surface/95 text-foreground hover:bg-surface">
          {t(typeLabel[l.type].key as never)}
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
          <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">{listingTitle(l, locale)}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t("by_company")} {listingCompany(l, locale)}</p>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3" />{listingCountry(l, locale)}
          </span>
          <span className="flex items-center gap-1 text-success font-medium">
            <TrendingUp className="h-3 w-3" />{t("commission")} {l.commission}%
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            {l.price > 0 ? (
              <div className="font-bold text-primary text-lg">${l.price.toLocaleString()}</div>
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
