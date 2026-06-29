import { Link } from "@tanstack/react-router";
import { MapPin, TrendingUp, Heart, MessageCircle, BadgeCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { translateEgyptCity, translateEgyptGovernorate } from "@/lib/egypt.locations";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/currency";

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
  city?: string | null;
  governorate?: string | null;
  commission_percentage: number | null;
  featured?: boolean | null;
  featured_until?: string | null;
  company_id?: string | null;
  companies?: { name_ar: string | null; name_en: string | null; phone?: string | null; is_verified?: boolean | null } | null;
};

const typeKey: Record<ListingType, string> = {
  product: "cat_product",
  service: "cat_service",
  real_estate: "cat_real_estate",
  land: "cat_land",
  factory: "cat_factory",
  company: "cat_company",
  opportunity: "cat_opportunity",
  market: "cat_market",
  fish_shed: "cat_fish_shed",
};

const placeholder = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'><rect width='4' height='3' fill='%23e2e8f0'/></svg>";

export function ListingCard({ l }: { l: ListingCardData }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [fav, setFav] = useState(false);
  const [favBusy, setFavBusy] = useState(false);

  const title = (locale === "ar" ? l.title_ar : l.title_en) ?? l.title_en ?? l.title_ar ?? "";
  const company = (locale === "ar" ? l.companies?.name_ar : l.companies?.name_en) ?? l.companies?.name_en ?? l.companies?.name_ar ?? "";
  const image = l.images?.[0] ?? placeholder;
  const wa = l.companies?.phone?.replace(/[^0-9]/g, "") ?? "";

  useEffect(() => {
    if (!user) return;
    supabase.from("favorites").select("id").eq("user_id", user.id).eq("listing_id", l.id).maybeSingle()
      .then(({ data }) => setFav(!!data));
  }, [user, l.id]);

  async function toggleFav(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error(t("nav_signin")); return; }
    setFavBusy(true);
    try {
      if (fav) {
        await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", l.id);
        setFav(false); toast.success(t("unfavorited"));
      } else {
        await supabase.from("favorites").insert({ user_id: user.id, listing_id: l.id });
        setFav(true); toast.success(t("favorited"));
      }
    } catch (err) { toast.error((err as Error).message); }
    finally { setFavBusy(false); }
  }

  return (
    <div className="group overflow-hidden rounded-3xl premium-panel transition-all duration-300 hover:-translate-y-1 hover:shadow-gold hover:border-primary/40">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        <img src={image} alt={title} loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        <Badge className="absolute top-3 start-3 bg-background/80 text-foreground border border-primary/20 backdrop-blur-md hover:bg-background/80">
          {t(typeKey[l.type] as never)}
        </Badge>
        {l.featured && (!l.featured_until || new Date(l.featured_until).getTime() > Date.now()) && (
          <Badge className="absolute top-3 end-3 bg-primary text-primary-foreground hover:bg-primary font-semibold tracking-wider">★ {t("feature_featured_listings")}</Badge>
        )}
        <button onClick={toggleFav} disabled={favBusy}
          className="absolute bottom-3 end-3 h-10 w-10 rounded-full bg-background/85 grid place-items-center hover:bg-background border border-primary/20 backdrop-blur-md transition disabled:opacity-50"
          aria-label={t("save_favorite")}>
          <Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : "text-foreground"}`} />
        </button>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">{title}</h3>
          {company && (
            <div className="text-xs text-muted-foreground mt-1 inline-flex flex-wrap items-center gap-2">
              {l.companies?.is_verified && (
                <Badge variant="secondary" className="text-[10px] tracking-[0.18em] px-2 py-1">{t("verified_company")}</Badge>
              )}
              <span>{t("by_company")} {company}</span>
            </div>
          )}
        {(l.city || l.governorate || l.country) && (
          <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />{
              [
                translateEgyptCity(l.city, locale) ?? l.city,
                translateEgyptGovernorate(l.governorate, locale) ?? l.governorate,
                l.country,
              ].filter(Boolean).join(", ")
            }
          </p>
        )}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3" />{l.country ?? "—"}
          </span>
          <span className="flex items-center gap-1 text-success font-medium">
            <TrendingUp className="h-3 w-3" />{t("commission")} {l.commission_percentage ?? 0}%
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border gap-2">
          <div className="min-w-0">
            {l.price && l.price > 0 ? (
              <div className="font-bold text-primary text-lg truncate">{formatPrice(l.price, locale)}</div>
            ) : (
              <div className="text-xs text-muted-foreground">—</div>
            )}
          </div>

          <div className="flex gap-1.5 flex-shrink-0">
            {wa && (
              <Button asChild size="sm" variant="outline" className="text-success border-success/40 hover:bg-success/5 hover:text-success px-2"
                onClick={(e) => e.stopPropagation()}>
                <a href={`https://wa.me/${wa}?text=${encodeURIComponent(title)}`} target="_blank" rel="noreferrer" aria-label={t("contact_whatsapp")}>
                  <MessageCircle className="h-4 w-4" />
                </a>
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <Link to="/listings/$id" params={{ id: l.id }}>{t("view_details")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
