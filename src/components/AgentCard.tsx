import { Link } from "@tanstack/react-router";
import { MapPin, Trophy, BadgeCheck } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import type { SampleAgent } from "@/lib/sampleData";

export function AgentCard({ a }: { a: SampleAgent }) {
  const { locale, t } = useI18n();
  return (
    <Link to="/agents/$id" params={{ id: a.id }} className="block rounded-lg border border-border bg-card p-5 shadow-card hover:shadow-elev transition">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-full bg-accent text-accent-foreground grid place-items-center font-bold text-xl flex-shrink-0">
          {a.initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold truncate">{locale === "ar" ? a.name_ar : a.name_en}</h3>
            {a.verified && <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" aria-label={t("verified_agent")} />}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{locale === "ar" ? a.headline_ar : a.headline_en}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{locale === "ar" ? a.country_ar : a.country_en}</span>
            <span className="flex items-center gap-1 text-success font-medium"><Trophy className="h-3 w-3" />{a.deals}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
