import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { TrustBadge } from "@/components/TrustBadges";
import { useI18n } from "@/i18n/I18nProvider";
import { initialOf } from "@/lib/marketplace";

export type AgentCardData = {
  id: string;
  user_id?: string | null;
  headline_ar: string | null;
  headline_en: string | null;
  country: string | null;
  is_verified: boolean | null;
  is_trusted?: boolean | null;
  is_premium?: boolean | null;
  profile?: { full_name: string | null; display_name?: string | null; avatar_url: string | null; phone_verified?: boolean | null } | null;
};

export function AgentCard({ a }: { a: AgentCardData }) {
  const { locale } = useI18n();
  const name = a.profile?.display_name || a.profile?.full_name || "Souqly Agent";
  const headline = (locale === "ar" ? a.headline_ar : a.headline_en) ?? a.headline_en ?? a.headline_ar ?? "";
  return (
    <Link to="/agents/$id" params={{ id: a.id }} className="block rounded-[1.5rem] border border-white/10 bg-surface-2 p-5 shadow-elev transition duration-200 hover:-translate-y-1 hover:bg-surface">
      <div className="flex items-start gap-4">
        {a.profile?.avatar_url ? (
          <img src={a.profile.avatar_url} alt="" loading="lazy" decoding="async" className="h-14 w-14 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="h-14 w-14 rounded-full bg-accent text-accent-foreground grid place-items-center font-bold text-xl flex-shrink-0">
            {initialOf(name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="font-semibold truncate">{name}</h3>
            {a.is_verified && <TrustBadge kind="verified_agent" />}
            {a.is_trusted && <TrustBadge kind="trusted_agent" />}
            {a.is_premium && <TrustBadge kind="premium_agent" />}
            {a.profile?.phone_verified && <TrustBadge kind="verified_phone" />}
          </div>
          {headline && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{headline}</p>}
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{a.country ?? "—"}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
