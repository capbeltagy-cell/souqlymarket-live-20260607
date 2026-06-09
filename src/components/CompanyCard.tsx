import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TrustBadge } from "@/components/TrustBadges";
import { useI18n } from "@/i18n/I18nProvider";
import { initialOf } from "@/lib/marketplace";

export type CompanyCardData = {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  industry: string | null;
  country: string | null;
  is_verified: boolean | null;
  is_premium?: boolean | null;
  logo_url: string | null;
  listingCount?: number;
};

export function CompanyCard({ c }: { c: CompanyCardData }) {
  const { locale, t } = useI18n();
  const name = (locale === "ar" ? c.name_ar : c.name_en) ?? c.name_en ?? c.name_ar ?? "";
  return (
    <Link to="/companies/$id" params={{ id: c.id }} className="block rounded-[1.5rem] border border-white/10 bg-surface-2 p-5 shadow-elev transition duration-200 hover:-translate-y-1 hover:bg-surface">
      <div className="flex items-start gap-4">
        {c.logo_url ? (
          <img src={c.logo_url} alt="" className="h-14 w-14 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="h-14 w-14 rounded-xl hero-gradient grid place-items-center text-primary-foreground font-bold text-xl flex-shrink-0">
            {initialOf(name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="font-semibold truncate">{name}</h3>
            {c.is_verified && <TrustBadge kind="verified_company" />}
            {c.is_premium && <TrustBadge kind="premium_company" />}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{c.industry ?? "—"}</p>
          <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.country ?? "—"}</span>
            {typeof c.listingCount === "number" && (
              <Badge variant="secondary" className="text-xs">{c.listingCount} {t("listings_count")}</Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

