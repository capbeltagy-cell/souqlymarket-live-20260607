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
    <div className="group overflow-hidden rounded-lg border border-border bg-card shadow-card hover:shadow-elev transition-all">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img src={image} alt={title} loading="lazy"
          className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        <Badge className="absolute top-3 start-3 bg-surface/95 text-foreground hover:bg-surface">
          {t(typeKey[l.type] as never)}
        </Badge>
        {l.featured && (!l.featured_until || new Date(l.featured_until).getTime() > Date.now()) && (
          <Badge className="absolute top-3 end-3 bg-accent text-accent-foreground hover:bg-accent">★</Badge>
        )}
        <button onClick={toggleFav} disabled={favBusy}
          className="absolute bottom-3 end-3 h-9 w-9 rounded-full bg-surface/95 grid place-items-center hover:bg-surface transition disabled:opacity-50"
          aria-label={t("save_favorite")}>
          <Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : ""}`} />
        </button>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">{title}</h3>
          {company && (
            <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
              {l.companies?.is_verified && <BadgeCheck className="h-3 w-3 text-primary" />}
              {t("by_company")} {company}
            </p>
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
              <div className="font-bold text-primary text-lg truncate">{l.currency ?? "USD"} {l.price.toLocaleString()}</div>
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
