import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Factory, Landmark, Package, Sparkles, TrendingUp, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { CompanyCard, type CompanyCardData } from "@/components/CompanyCard";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/currency";

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

function EmptyState({ label, href }: { label: string; href: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-surface/50 p-8 text-center">
      <p className="text-sm text-muted-foreground mb-3">{t("empty_no_items")}</p>
      <Button asChild variant="outline" size="sm">
        <Link to={href}>{label}</Link>
      </Button>
    </div>
  );
}

function Landing() {
  const { t, dir, locale } = useI18n();
  const ar = locale === "ar";
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;
  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [products, setProducts] = useState<ListingCardData[]>([]);
  const [properties, setProperties] = useState<ListingCardData[]>([]);
  const [lands, setLands] = useState<ListingCardData[]>([]);
  const [factoryListings, setFactoryListings] = useState<ListingCardData[]>([]);
  const [companies, setCompanies] = useState<CompanyCardData[]>([]);
  const [wholesale, setWholesale] = useState<any[]>([]);
  const [rfqs, setRfqs] = useState<Array<{ id: string; title: string; governorate: string | null; budget_min: number | null; budget_max: number | null }>>([]);
  const [tenders, setTenders] = useState<Array<{ id: string; title: string; governorate: string | null; budget: number | null; deadline: string | null }>>([]);
  const [counts, setCounts] = useState({ companies: 0, listings: 0, agents: 0, leads: 0 });

  useEffect(() => {
    (async () => {
      const listingSelect = "id, type, title_ar, title_en, images, price, currency, country, city, governorate, commission_percentage, featured, featured_until, company_id, companies(name_ar, name_en, phone, is_verified)";
      const [lRes, pRes, reRes, landRes, facRes, cRes, wRes, rfqRes, tenderRes, cCount, lCount, aCount, leadCount] = await Promise.all([
        supabase.from("listings").select(listingSelect).eq("status", "approved").order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(4),
        supabase.from("listings").select(listingSelect).eq("status", "approved").eq("type", "product").order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(4),
        supabase.from("listings").select(listingSelect).eq("status", "approved").eq("type", "real_estate").order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(4),
        supabase.from("listings").select(listingSelect).eq("status", "approved").eq("type", "land").order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(4),
        supabase.from("listings").select(listingSelect).eq("status", "approved").eq("type", "factory").order("created_at", { ascending: false }).limit(4),
        supabase.from("companies").select("id, name_ar, name_en, industry, country, is_verified, logo_url").order("is_verified", { ascending: false }).limit(6),
        supabase.from("wholesale_listings").select("*, companies(name_ar, name_en, is_verified)").eq("active", true).order("created_at", { ascending: false }).limit(4),
        supabase.from("rfqs").select("id, title, governorate, budget_min, budget_max").eq("status", "open").order("created_at", { ascending: false }).limit(4),
        supabase.from("tenders").select("id, title, governorate, budget, deadline").eq("status", "open").order("created_at", { ascending: false }).limit(4),
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("agents").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
      ]);
      setListings((lRes.data ?? []) as unknown as ListingCardData[]);
      setProducts((pRes.data ?? []) as unknown as ListingCardData[]);
      setProperties((reRes.data ?? []) as unknown as ListingCardData[]);
      setLands((landRes.data ?? []) as unknown as ListingCardData[]);
      setFactoryListings((facRes.data ?? []) as unknown as ListingCardData[]);
      setCompanies((cRes.data ?? []) as CompanyCardData[]);
      setWholesale((wRes.data ?? []) as any[]);
      setRfqs((rfqRes.data ?? []) as never);
      setTenders((tenderRes.data ?? []) as never);
      setCounts({
        companies: cCount.count ?? 0,
        listings: lCount.count ?? 0,
        agents: aCount.count ?? 0,
        leads: leadCount.count ?? 0,
      });
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden hero-gradient text-primary-foreground">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px, 60px 60px",
        }} />
        <div className="container-souqly relative py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] backdrop-blur">
              <Sparkles className="h-3 w-3" />{t("tagline")}
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">{t("hero_title")}</h1>
            <p className="text-base md:text-lg text-primary-foreground/85 max-w-xl">{t("hero_subtitle")}</p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/marketplace" className="gap-2">{t("cta_explore")}<Arrow className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white/10 border-white/20 text-primary-foreground hover:bg-white/15">
                <Link to="/auth" search={{ mode: "signup" }}>{t("cta_join_company")}</Link>
              </Button>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { label: locale === "ar" ? "شركات موثوقة" : "Verified companies" },
                { label: locale === "ar" ? "تواصل سريع" : "Fast connections" },
                { label: locale === "ar" ? "قوائم مصدقة" : "Approved listings" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-white/10 px-3 py-2.5 text-sm text-primary-foreground/80 text-center">
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

      {/* Categories */}
      <section className="container-souqly py-10">
        <h2 className="text-xl md:text-2xl font-bold mb-6 text-center">{t("section_categories")}</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {categories.map(({ key, icon: Icon }) => (
            <Link key={key} to="/marketplace" className="group rounded-2xl border border-white/10 bg-surface p-5 text-center hover:border-primary/30 hover:shadow-elev transition">
              <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center mb-2 group-hover:bg-primary group-hover:text-primary-foreground transition">
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-sm font-semibold text-foreground">{t(key)}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured listings */}
      <section className="container-souqly py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl md:text-2xl font-bold">{t("section_featured")}</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/marketplace" className="gap-1">{t("cta_explore")} <Arrow className="h-4 w-4" /></Link></Button>
        </div>
        {listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {listings.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        ) : (
          <EmptyState label={t("cta_explore")} href="/marketplace" />
        )}
      </section>

      {/* Companies */}
      <section className="container-souqly py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl md:text-2xl font-bold">{t("section_top_companies")}</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/companies" className="gap-1">{t("nav_companies")} <Arrow className="h-4 w-4" /></Link></Button>
        </div>
        {companies.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((c) => <CompanyCard key={c.id} c={c} />)}
          </div>
        ) : (
          <EmptyState label={t("nav_companies")} href="/companies" />
        )}
      </section>

      {/* Products */}
      <section className="container-souqly py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl md:text-2xl font-bold">{t("featured_products")}</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/marketplace" className="gap-1">{t("view_all")} <Arrow className="h-4 w-4" /></Link></Button>
        </div>
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        ) : (
          <EmptyState label={t("view_all")} href="/marketplace" />
        )}
      </section>

      {/* Wholesale */}
      <section className="container-souqly py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl md:text-2xl font-bold">{locale === "ar" ? "منتجات الجملة" : "Wholesale products"}</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/wholesale" className="gap-1">{t("view_all")} <Arrow className="h-4 w-4" /></Link></Button>
        </div>
        {wholesale.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {wholesale.map((w) => {
              const title = w.title ?? "";
              const company = (locale === "ar" ? w.companies?.name_ar : w.companies?.name_en) ?? w.companies?.name_en ?? w.companies?.name_ar ?? "";
              return (
                <Link key={w.id} to="/wholesale/$id" params={{ id: w.id }} className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-surface-2 shadow-elev transition-all duration-200 hover:-translate-y-1 hover:bg-surface">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {w.images?.[0] ? (
                      <img src={w.images[0]} alt={title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="h-full w-full bg-muted grid place-items-center text-muted-foreground text-sm">{locale === "ar" ? "لا توجد صورة" : "No image"}</div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">{title}</h3>
                    {company && <p className="text-xs text-muted-foreground">{company}</p>}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      {w.price_per_unit ? (
                        <div className="font-bold text-primary text-sm">{formatPrice(w.price_per_unit, locale)} <span className="text-xs text-muted-foreground font-normal">/ {locale === "ar" ? "وحدة" : "unit"}</span></div>
                      ) : (
                        <div className="text-xs text-muted-foreground">—</div>
                      )}
                      <div className="text-xs text-muted-foreground">{locale === "ar" ? "الحد الأدنى" : "MOQ"}: {w.moq}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState label={locale === "ar" ? "تصفح الجملة" : "Browse wholesale"} href="/wholesale" />
        )}
      </section>

      {/* Real Estate */}
      <section className="container-souqly py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl md:text-2xl font-bold">{t("featured_properties")}</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/real-estate" className="gap-1">{t("view_all")} <Arrow className="h-4 w-4" /></Link></Button>
        </div>
        {properties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {properties.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        ) : (
          <EmptyState label={t("view_all")} href="/real-estate" />
        )}
      </section>

      {/* Lands */}
      <section className="container-souqly py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl md:text-2xl font-bold">{t("featured_lands")}</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/lands" className="gap-1">{t("view_all")} <Arrow className="h-4 w-4" /></Link></Button>
        </div>
        {lands.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {lands.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        ) : (
          <EmptyState label={t("view_all")} href="/lands" />
        )}
      </section>

      {/* Factories */}
      <section className="container-souqly py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl md:text-2xl font-bold">{t("featured_factories")}</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/factories" className="gap-1">{t("view_all")} <Arrow className="h-4 w-4" /></Link></Button>
        </div>
        {factoryListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {factoryListings.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        ) : (
          <EmptyState label={t("view_all")} href="/factories" />
        )}
      </section>

      {/* RFQs & Tenders */}
      <section className="container-souqly py-8">
        <div className="grid lg:grid-cols-2 gap-5">
          {/* RFQs */}
          <div className="rounded-[1.5rem] panel-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{t("featured_rfqs")}</h3>
              <Button asChild variant="ghost" size="sm"><Link to="/rfq">{t("view_all")}</Link></Button>
            </div>
            {rfqs.length > 0 ? (
              <div className="space-y-3">
                {rfqs.map((r) => (
                  <Link key={r.id} to="/rfq/$id" params={{ id: r.id }} className="block rounded-xl border border-white/10 bg-surface p-4 hover:bg-surface-2 transition">
                    <div className="font-semibold text-sm line-clamp-1">{r.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {r.governorate ?? "—"} · {r.budget_min ? `${r.budget_min.toLocaleString()} - ${(r.budget_max ?? r.budget_min).toLocaleString()} EGP` : "—"}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState label={t("view_all")} href="/rfq" />
            )}
          </div>

          {/* Tenders */}
          <div className="rounded-[1.5rem] panel-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{t("featured_tenders")}</h3>
              <Button asChild variant="ghost" size="sm"><Link to="/tenders">{t("view_all")}</Link></Button>
            </div>
            {tenders.length > 0 ? (
              <div className="space-y-3">
                {tenders.map((r) => (
                  <Link key={r.id} to="/tenders/$id" params={{ id: r.id }} className="block rounded-xl border border-white/10 bg-surface p-4 hover:bg-surface-2 transition">
                    <div className="font-semibold text-sm line-clamp-1">{r.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {r.governorate ?? "—"} · {r.budget ? `${r.budget.toLocaleString()} EGP` : "—"} {r.deadline ? `· ${r.deadline}` : ""}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState label={t("view_all")} href="/tenders" />
            )}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
