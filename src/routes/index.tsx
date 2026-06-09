import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Briefcase, Building2, Factory, Handshake, Landmark, Package, ShieldCheck, Sparkles, TrendingUp, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { CompanyCard, type CompanyCardData } from "@/components/CompanyCard";
import { AgentCard, type AgentCardData } from "@/components/AgentCard";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";

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
  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [products, setProducts] = useState<ListingCardData[]>([]);
  const [properties, setProperties] = useState<ListingCardData[]>([]);
  const [lands, setLands] = useState<ListingCardData[]>([]);
  const [factoryListings, setFactoryListings] = useState<ListingCardData[]>([]);
  const [companies, setCompanies] = useState<CompanyCardData[]>([]);
  const [agents, setAgents] = useState<AgentCardData[]>([]);
  const [rfqs, setRfqs] = useState<Array<{ id: string; title: string; governorate: string | null; budget_min: number | null; budget_max: number | null }>>([]);
  const [tenders, setTenders] = useState<Array<{ id: string; title: string; governorate: string | null; budget: number | null; deadline: string | null }>>([]);
  const [stats, setStats] = useState({ companies: 0, factories: 0, agents: 0, listings: 0, verified: 0 });

  useEffect(() => {
    (async () => {
      const listingSelect = "id, type, title_ar, title_en, images, price, currency, country, city, governorate, commission_percentage, featured, featured_until, company_id, companies(name_ar, name_en, phone, is_verified)";
      const [lRes, pRes, reRes, landRes, facRes, cRes, aRes, rfqRes, tenderRes,
             cCount, fCount, aCount, lCount, vCount] = await Promise.all([
        supabase.from("listings").select(listingSelect).eq("status", "approved").order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(4),
        supabase.from("listings").select(listingSelect).eq("status", "approved").eq("type", "product").order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(4),
        supabase.from("listings").select(listingSelect).eq("status", "approved").eq("type", "real_estate").order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(4),
        supabase.from("listings").select(listingSelect).eq("status", "approved").eq("type", "land").order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(4),
        supabase.from("listings").select(listingSelect).eq("status", "approved").eq("type", "factory").order("created_at", { ascending: false }).limit(4),
        supabase.from("companies").select("id, name_ar, name_en, industry, country, is_verified, logo_url").order("is_verified", { ascending: false }).limit(6),
        supabase.from("agents").select("id, user_id, headline_ar, headline_en, country, is_verified").order("is_verified", { ascending: false }).limit(4),
        supabase.from("rfqs").select("id, title, governorate, budget_min, budget_max").eq("status", "open").order("created_at", { ascending: false }).limit(4),
        supabase.from("tenders").select("id, title, governorate, budget, deadline").eq("status", "open").order("created_at", { ascending: false }).limit(4),
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("factories").select("company_id", { count: "exact", head: true }),
        supabase.from("agents").select("id", { count: "exact", head: true }),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("companies").select("id", { count: "exact", head: true }).eq("is_verified", true),
      ]);
      setListings((lRes.data ?? []) as unknown as ListingCardData[]);
      setProducts((pRes.data ?? []) as unknown as ListingCardData[]);
      setProperties((reRes.data ?? []) as unknown as ListingCardData[]);
      setLands((landRes.data ?? []) as unknown as ListingCardData[]);
      setFactoryListings((facRes.data ?? []) as unknown as ListingCardData[]);
      setCompanies((cRes.data ?? []) as CompanyCardData[]);
      setRfqs((rfqRes.data ?? []) as never);
      setTenders((tenderRes.data ?? []) as never);
      setStats({
        companies: cCount.count ?? 0,
        factories: fCount.count ?? 0,
        agents: aCount.count ?? 0,
        listings: lCount.count ?? 0,
        verified: vCount.count ?? 0,
      });
      const agentList = aRes.data ?? [];
      const userIds = agentList.map((a) => a.user_id).filter(Boolean) as string[];
      const profiles = userIds.length
        ? (await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds)).data ?? []
        : [];
      const byId = new Map(profiles.map((p) => [p.id, p]));
      setAgents(agentList.map((a) => ({ ...a, profile: byId.get(a.user_id) ?? null })) as AgentCardData[]);
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <section className="relative overflow-hidden hero-gradient text-primary-foreground">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px, 60px 60px",
        }} />
        <div className="container-souqly relative py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] backdrop-blur">
              <Sparkles className="h-3 w-3" />{t("tagline")}
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">{t("hero_title")}</h1>
            <p className="text-lg text-primary-foreground/85 max-w-xl">{t("hero_subtitle")}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/marketplace" className="gap-2">{t("cta_explore")}<Arrow className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white/10 border-white/20 text-primary-foreground hover:bg-white/15">
                <Link to="/auth" search={{ mode: "signup" }}>{t("cta_join_company")}</Link>
              </Button>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "شركات موثوقة" },
                { label: "تواصل سريع" },
                { label: "قوائم مصدقة" },
                { label: "دعم 24/7" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-primary-foreground/80">
                  {item.label}
                </div>
              ))}
            </div>
          </div>
          <div className="hidden md:block relative">
            <div className="absolute inset-0 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10" />
            <div className="relative grid grid-cols-2 gap-4 p-6">
              {(listings.length ? listings : Array.from({ length: 4 })).slice(0, 4).map((l, i) => (
                <div key={(l as ListingCardData)?.id ?? i} className="rounded-lg overflow-hidden bg-white/10 border border-white/20">
                  <div className="aspect-[4/3] w-full bg-white/5">
                    {(l as ListingCardData)?.images?.[0] && <img src={(l as ListingCardData).images![0]} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="p-2 text-xs truncate">{(l as ListingCardData)?.type ? t(`cat_${(l as ListingCardData).type}` as never) : "—"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-souqly py-14">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.5rem] glass-card p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: t("companies_count"), value: companies.length, subtitle: t("trusted_companies") },
                { label: t("listings_count"), value: listings.length, subtitle: t("active_listings") },
                { label: t("nav_agents"), value: agents.length, subtitle: t("pro_agents") },
                { label: t("section_featured"), value: listings.filter((l) => l.featured).length, subtitle: t("featured_items") },
              ].map((stat) => (
                <div key={stat.label} className="rounded-3xl bg-surface p-5">
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-2">{stat.subtitle}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.5rem] panel-card p-8 flex flex-col justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.2em] text-accent">{t("trust_indicators")}</div>
              <h2 className="text-3xl font-bold mt-4">{t("trusted_b2b_network")}</h2>
              <p className="text-muted-foreground mt-3">{t("trust_subtitle")}</p>
            </div>
            <div className="grid gap-3 mt-8">
              {[
                { title: t("verified_profiles"), description: t("verified_profiles_desc") },
                { title: t("secure_transactions"), description: t("secure_transactions_desc") },
                { title: t("fast_connect"), description: t("fast_connect_desc") },
              ].map((item) => (
                <div key={item.title} className="rounded-3xl border border-white/10 bg-surface p-5">
                  <div className="font-semibold">{item.title}</div>
                  <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-souqly py-14">
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h2 className="text-3xl font-bold">{t("success_stories")}</h2>
            <p className="text-muted-foreground mt-2">{t("success_stories_subtitle")}</p>
          </div>
          <Button asChild variant="outline" className="border-white/20 bg-surface hover:bg-white/5">
            <Link to="/about">{t("learn_more")}</Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: t("story_1_title"), body: t("story_1_body") },
            { title: t("story_2_title"), body: t("story_2_body") },
            { title: t("story_3_title"), body: t("story_3_body") },
          ].map((story) => (
            <div key={story.title} className="rounded-3xl border border-border bg-card p-6 shadow-card hover:-translate-y-1 transition">
              <div className="text-sm text-muted-foreground uppercase tracking-[0.18em] mb-3">{t("success")}</div>
              <h3 className="font-semibold text-xl mb-3">{story.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{story.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="container-souqly py-6 grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          {[
            { icon: ShieldCheck, label: t("companies_count") },
            { icon: ShieldCheck, label: t("nav_agents") },
            { icon: Building2, label: t("nav_companies") },
            { icon: Package, label: t("section_featured") },
            { icon: Sparkles, label: t("cta_join_company") },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <Icon className="h-5 w-5 text-primary" />
              <div className="text-xs font-medium">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-souqly py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">{t("section_categories")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map(({ key, icon: Icon }) => (
            <Link key={key} to="/marketplace" className="group rounded-3xl border border-white/10 bg-surface p-6 text-center hover:border-primary/30 hover:shadow-elev transition">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition">
                <Icon className="h-6 w-6" />
              </div>
              <div className="text-sm font-semibold text-foreground">{t(key)}</div>
            </Link>
          ))}
        </div>
      </section>

      {listings.length > 0 && (
        <section className="container-souqly py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold">{t("section_featured")}</h2>
            <Button asChild variant="ghost"><Link to="/marketplace" className="gap-1">{t("cta_explore")} <Arrow className="h-4 w-4" /></Link></Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {listings.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        </section>
      )}

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

      {companies.length > 0 && (
        <section className="container-souqly py-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold">{t("section_top_companies")}</h2>
            <Button asChild variant="ghost"><Link to="/companies" className="gap-1">{t("nav_companies")} <Arrow className="h-4 w-4" /></Link></Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((c) => <CompanyCard key={c.id} c={c} />)}
          </div>
        </section>
      )}

      {agents.length > 0 && (
        <section className="container-souqly py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold">{t("section_top_agents")}</h2>
            <Button asChild variant="ghost"><Link to="/agents" className="gap-1">{t("nav_agents")} <Arrow className="h-4 w-4" /></Link></Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {agents.map((a) => <AgentCard key={a.id} a={a} />)}
          </div>
        </section>
      )}

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
