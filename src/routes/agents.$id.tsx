import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MapPin, Trophy, Mail, TrendingUp, Star, BadgeCheck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/ListingCard";
import { useI18n } from "@/i18n/I18nProvider";
import { sampleAgents, sampleListings } from "@/lib/sampleData";

export const Route = createFileRoute("/agents/$id")({
  loader: ({ params }) => {
    const agent = sampleAgents.find((a) => a.id === params.id);
    if (!agent) throw notFound();
    return { agent };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.agent.name_en ?? "Agent"} — Souqly` }],
  }),
  notFoundComponent: () => <div className="p-10 text-center">Agent not found</div>,
  errorComponent: () => <div className="p-10 text-center">Something went wrong</div>,
  component: AgentProfile,
});

function AgentProfile() {
  const { agent } = Route.useLoaderData();
  const { locale, t } = useI18n();
  const name = locale === "ar" ? agent.name_ar : agent.name_en;
  const headline = locale === "ar" ? agent.headline_ar : agent.headline_en;
  const country = locale === "ar" ? agent.country_ar : agent.country_en;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="hero-gradient text-primary-foreground">
        <div className="container-souqly py-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="h-24 w-24 rounded-full bg-accent text-accent-foreground grid place-items-center text-4xl font-bold">
            {agent.initial}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{name}</h1>
            <p className="opacity-90 mt-1">{headline}</p>
            <div className="flex items-center gap-4 mt-3 text-sm opacity-90">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{country}</span>
              <span className="flex items-center gap-1"><Trophy className="h-4 w-4" />{agent.deals} {t("deals_closed")}</span>
            </div>
          </div>
          <Button variant="secondary" className="gap-2"><Mail className="h-4 w-4" />{t("contact_agent")}</Button>
        </div>
      </section>
      <section className="container-souqly py-8 flex-1 grid lg:grid-cols-3 gap-6">
        <aside className="lg:col-span-1 space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-card">
            <h2 className="font-semibold mb-3">{t("agent_stats")}</h2>
            <div className="grid grid-cols-2 gap-3">
              <Stat icon={Trophy} label={t("deals_closed")} value={String(agent.deals)} />
              <Stat icon={Star} label="★" value="4.9" />
              <Stat icon={TrendingUp} label={t("commission")} value="12%" />
              <Stat icon={MapPin} label={t("filter_country")} value={country} />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 shadow-card">
            <h2 className="font-semibold mb-2">{t("about")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{headline}</p>
          </div>
          <Button asChild variant="outline" className="w-full"><Link to="/agents">← {t("nav_agents")}</Link></Button>
        </aside>
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">{t("portfolio")}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {sampleListings.slice(0, 4).map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-2 p-3">
      <Icon className="h-4 w-4 text-primary mb-1" />
      <div className="text-base font-bold">{value}</div>
      <div className="text-xs text-muted-foreground truncate">{label}</div>
    </div>
  );
}
