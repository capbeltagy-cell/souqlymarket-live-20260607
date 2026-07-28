import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Star } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrustBadge } from "@/components/TrustBadges";
import { useI18n } from "@/i18n/I18nProvider";
import { getPublicAgentProfile } from "@/lib/public-agent.functions";
import { initialOf } from "@/lib/marketplace";

export const Route = createFileRoute("/agents/$id")({
  loader: async ({ params }) => {
    const { getAgentMeta } = await import("@/lib/seo.functions");
    return { meta: await getAgentMeta({ data: { id: params.id } }) };
  },
  head: ({ loaderData, params }) => {
    const m = loaderData?.meta;
    const name = m?.full_name ?? "Souqly Agent";
    const headline = m?.headline_en ?? m?.headline_ar ?? "";
    const title = `${name}${headline ? ` — ${headline}` : ""} — Souqly`;
    const desc = (m?.bio_en ?? m?.bio_ar ?? `${name} on Souqly — B2B sales agent.`).slice(0, 160);
    const img = m?.avatar_url ?? undefined;
    const url = `/agents/${params.id}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: url },
        ...(img
          ? [
              { property: "og:image", content: img },
              { name: "twitter:image", content: img },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  notFoundComponent: () => (
    <Shell>
      <div className="p-10 text-center">Agent not found</div>
    </Shell>
  ),
  errorComponent: () => (
    <Shell>
      <div className="p-10 text-center">Something went wrong</div>
    </Shell>
  ),
  component: AgentProfile,
});

type Agent = {
  id: string;
  user_id: string;
  headline_ar: string | null;
  headline_en: string | null;
  bio_ar: string | null;
  bio_en: string | null;
  country: string | null;
  city: string | null;
  specialties: string[] | null;
  languages: string[] | null;
  is_verified: boolean;
  is_trusted: boolean | null;
  is_premium: boolean | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  phone_verified: boolean | null;
};

function AgentProfile() {
  const { id } = Route.useParams();
  const { locale, t } = useI18n();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const loadPublicAgent = useServerFn(getPublicAgentProfile);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadPublicAgent({ data: { id } })
      .then((result) => {
        if (!active) return;
        setAgent(result.agent as Agent | null);
        setProfile(result.profile as Profile | null);
      })
      .catch(() => {
        if (!active) return;
        setAgent(null);
        setProfile(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, loadPublicAgent]);

  if (loading)
    return (
      <Shell>
        <div className="p-10 text-center text-muted-foreground">{t("loading")}</div>
      </Shell>
    );
  if (!agent)
    return (
      <Shell>
        <div className="p-10 text-center">Agent not found</div>
      </Shell>
    );

  const name = profile?.display_name || profile?.full_name || "Souqly Agent";
  const headline = (locale === "ar" ? agent.headline_ar : agent.headline_en) ?? "";
  const bio = (locale === "ar" ? agent.bio_ar : agent.bio_en) ?? "";
  const country = [agent.city, agent.country].filter(Boolean).join(", ");

  return (
    <Shell>
      <section className="hero-gradient text-primary-foreground">
        <div className="container-souqly py-10 flex flex-col md:flex-row md:items-center gap-6">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <div className="h-24 w-24 rounded-full bg-accent text-accent-foreground grid place-items-center text-4xl font-bold">
              {initialOf(name)}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-bold">{name}</h1>
              {agent.is_verified && <TrustBadge kind="verified_agent" />}
              {agent.is_trusted && <TrustBadge kind="trusted_agent" />}
              {agent.is_premium && <TrustBadge kind="premium_agent" />}
              {profile?.phone_verified && <TrustBadge kind="verified_phone" />}
            </div>
            {headline && <p className="opacity-90 mt-1">{headline}</p>}
            <div className="flex items-center gap-4 mt-3 text-sm opacity-90 flex-wrap">
              {country && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {country}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>
      <section className="container-souqly py-8 flex-1 grid lg:grid-cols-3 gap-6">
        <aside className="lg:col-span-1 space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-card">
            <h2 className="font-semibold mb-2">{t("about")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {bio || headline || "—"}
            </p>
            {agent.specialties && agent.specialties.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {agent.specialties.map((s) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
            {agent.languages && agent.languages.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {agent.languages.map((l) => (
                  <Badge key={l} variant="outline">
                    {l}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link to="/agents">← {t("nav_agents")}</Link>
          </Button>
        </aside>
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-card p-6 shadow-card">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <Star className="h-5 w-5 text-accent" />
              {t("portfolio")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("empty_referrals")}</p>
          </div>
        </div>
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
