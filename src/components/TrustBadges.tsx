import { BadgeCheck, Phone, ShieldCheck, Crown, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nProvider";

type Kind =
  | "verified_phone"
  | "verified_company"
  | "trusted_agent"
  | "premium_company"
  | "premium_agent"
  | "verified_agent"
  | "owner";

const meta: Record<Kind, { icon: React.ElementType; cls: string; key: string }> = {
  verified_phone: {
    icon: Phone,
    cls: "bg-success/15 text-success border-success/30",
    key: "badge_verified_phone",
  },
  verified_company: {
    icon: BadgeCheck,
    cls: "bg-primary/15 text-primary border-primary/30",
    key: "verified_company",
  },
  verified_agent: {
    icon: BadgeCheck,
    cls: "bg-primary/15 text-primary border-primary/30",
    key: "verified_agent",
  },
  trusted_agent: {
    icon: ShieldCheck,
    cls: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    key: "badge_trusted_agent",
  },
  premium_company: {
    icon: Crown,
    cls: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    key: "badge_premium_company",
  },
  premium_agent: {
    icon: Crown,
    cls: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    key: "badge_premium_agent",
  },
  owner: {
    icon: Star,
    cls: "bg-accent/15 text-accent-foreground border-accent/30",
    key: "badge_profile_owner",
  },
};

export function TrustBadge({ kind, className = "" }: { kind: Kind; className?: string }) {
  const { t } = useI18n();
  const m = meta[kind];
  const Icon = m.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${m.cls} ${className}`}>
      <Icon className="h-3 w-3" />
      <span className="normal-case tracking-normal text-[10px] font-medium">
        {t(m.key as never)}
      </span>
    </Badge>
  );
}

export function profileCompletion(c: {
  logo_url?: string | null;
  cover_url?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  industry?: string | null;
  country?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  is_verified?: boolean | null;
}): number {
  const items = [
    !!c.logo_url,
    !!c.cover_url,
    !!(c.description_ar || c.description_en),
    !!c.industry,
    !!c.country,
    !!c.city,
    !!c.phone,
    !!c.email,
    !!c.website,
    !!c.is_verified,
  ];
  return Math.round((items.filter(Boolean).length / items.length) * 100);
}
