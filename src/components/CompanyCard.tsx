import { BadgeCheck, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nProvider";
import type { SampleCompany } from "@/lib/sampleData";

export function CompanyCard({ c }: { c: SampleCompany }) {
  const { locale, t } = useI18n();
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card hover:shadow-elev transition">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-md hero-gradient grid place-items-center text-primary-foreground font-bold text-xl flex-shrink-0">
          {c.initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold truncate">{locale === "ar" ? c.name_ar : c.name_en}</h3>
            {c.verified && <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{locale === "ar" ? c.industry_ar : c.industry_en}</p>
          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{locale === "ar" ? c.country_ar : c.country_en}</span>
            <Badge variant="secondary" className="text-xs">{c.listings} {t("listings_count")}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
