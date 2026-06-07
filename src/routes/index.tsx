import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Briefcase, Building2, Factory, Handshake, Landmark, LineChart, MapPin, Package, ShieldCheck, Sparkles, TrendingUp, Users, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ListingCard } from "@/components/ListingCard";
import { CompanyCard } from "@/components/CompanyCard";
import { AgentCard } from "@/components/AgentCard";
import { useI18n } from "@/i18n/I18nProvider";
import { sampleAgents, sampleCompanies, sampleListings } from "@/lib/sampleData";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Souqly — سوقلي | B2B Marketplace" },
      { name: "description", content: "Connect companies with professional sales agents. Products, services, real estate, factories and investment opportunities." },
    ],
  }),
  component: Landing,
});

const categories = [
  { key: "cat_product", icon: Package },
  { key: "cat_service", icon: Wrench },
  { key: "cat_real_estate", icon: Building2 },
  { key: "cat_land", icon: Landmark },
  { key: "cat_factory", icon: Factory },
  { key: "cat_opportunity", icon: TrendingUp },
] as const;

function Landing() {
  const { t, dir } = useI18n();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden hero-gradient text-primary-foreground">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px, 60px 60px",
        }} />
        <div className="container-souqly relative py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs backdrop-blur">
              <Sparkles className="h-3 w-3" />{t("tagline")}
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">{t("hero_title")}</h1>
            <p className="text-lg text-primary-foreground/85 max-w-xl">{t("hero_subtitle")}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/marketplace" className="gap-2">{t("cta_explore")}<Arrow className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white/5 border-white/30 text-primary-foreground hover:bg-white/10">
                <Link to="/auth" search={{ mode: "signup" }}>{t("cta_join_company")}</Link>
              </Button>
            </div>
            <div className="flex gap-8 pt-6 text-sm">
              <div><div className="text-2xl font-bold">2.4K+</div><div className="text-primary-foreground/70">{t("companies_count")}</div></div>
              <div><div className="text-2xl font-bold">8.7K+</div><div className="text-primary-foreground/70">{t("agents_count")}</div></div>
              <div><div className="text-2xl font-bold">15K+</div><div className="text-primary-foreground/70">{t("listings_count")}</div></div>
            </div>
          </div>
          <div className="hidden md:block relative">
            <div className="absolute inset-0 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10" />
            <div className="relative grid grid-cols-2 gap-4 p-6">
              {sampleListings.slice(0, 4).map((l) => (
                <div key={l.id} className="rounded-lg overflow-hidden bg-white/10 border border-white/20">
                  <img src={l.image} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                  <div className="p-2 text-xs truncate">{t(`cat_${l.type}` as never)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-souqly py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">{t("section_categories")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map(({ key, icon: Icon }) => (
            <Link key={key} to="/marketplace" className="group rounded-lg border border-border bg-card p-6 text-center hover:border-primary hover:shadow-elev transition">
              <div className="mx-auto h-12 w-12 rounded-lg bg-primary/10 text-primary grid place-items-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition">
                <Icon className="h-6 w-6" />
              </div>
              <div className="text-sm font-medium">{t(key)}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured listings */}
      <section className="container-souqly py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">{t("section_featured")}</h2>
          <Button asChild variant="ghost"><Link to="/marketplace" className="gap-1">{t("cta_explore")} <Arrow className="h-4 w-4" /></Link></Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {sampleListings.slice(0, 4).map((l) => <ListingCard key={l.id} l={l} />)}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface-2 mt-16 py-16">
        <div className="container-souqly">
          <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">{t("section_how_it_works")}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Briefcase, title: "how_1_title", body: "how_1_body" },
              { icon: Handshake, title: "how_2_title", body: "how_2_body" },
              { icon: ShieldCheck, title: "how_3_title", body: "how_3_body" },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-lg bg-card border border-border p-6">
                <div className="h-12 w-12 rounded-md bg-primary text-primary-foreground grid place-items-center mb-4">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{t(title as never)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(body as never)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top companies */}
      <section className="container-souqly py-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">{t("section_top_companies")}</h2>
          <Button asChild variant="ghost"><Link to="/companies" className="gap-1">{t("nav_companies")} <Arrow className="h-4 w-4" /></Link></Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sampleCompanies.slice(0, 6).map((c) => <CompanyCard key={c.id} c={c} />)}
        </div>
      </section>

      {/* Top agents */}
      <section className="container-souqly py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">{t("section_top_agents")}</h2>
          <Button asChild variant="ghost"><Link to="/agents" className="gap-1">{t("nav_agents")} <Arrow className="h-4 w-4" /></Link></Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sampleAgents.map((a) => <AgentCard key={a.id} a={a} />)}
        </div>
      </section>

      {/* CTA band */}
      <section className="container-souqly py-16">
        <div className="hero-gradient rounded-2xl p-10 md:p-14 text-primary-foreground grid md:grid-cols-2 gap-6 items-center">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold mb-2">{t("cta_join_agent")}</h3>
            <p className="text-primary-foreground/80">{t("how_2_body")}</p>
          </div>
          <div className="flex md:justify-end gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/auth" search={{ mode: "signup" }}>{t("cta_join_agent")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-white/5 border-white/30 text-primary-foreground hover:bg-white/10">
              <Link to="/pricing">{t("nav_pricing")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
