import { Link } from "@tanstack/react-router";
import { MapPin, BadgeCheck } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { initialOf } from "@/lib/marketplace";

export type AgentCardData = {
  id: string;
  user_id?: string | null;
  headline_ar: string | null;
  headline_en: string | null;
  country: string | null;
  is_verified: boolean | null;
  profile?: { full_name: string | null; avatar_url: string | null } | null;
};

export function AgentCard({ a }: { a: AgentCardData }) {
  const { locale, t } = useI18n();
  const name = a.profile?.full_name ?? "Souqly Agent";
  const headline = (locale === "ar" ? a.headline_ar : a.headline_en) ?? a.headline_en ?? a.headline_ar ?? "";
  return (
    <Link to="/agents/$id" params={{ id: a.id }} className="block rounded-lg border border-border bg-card p-5 shadow-card hover:shadow-elev transition">
      <div className="flex items-start gap-4">
        {a.profile?.avatar_url ? (
          <img src={a.profile.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="h-14 w-14 rounded-full bg-accent text-accent-foreground grid place-items-center font-bold text-xl flex-shrink-0">
            {initialOf(name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold truncate">{name}</h3>
            {a.is_verified && <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" aria-label={t("verified_agent")} />}
          </div>
          {headline && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{headline}</p>}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{a.country ?? "—"}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
