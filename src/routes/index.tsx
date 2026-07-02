import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Building2, Factory, Landmark, Package, Search, Sparkles, TrendingUp, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { CompanyCard, type CompanyCardData } from "@/components/CompanyCard";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/currency";

const HOME_OG_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8fff3fe8-f141-43f1-a7f7-cfccdc44dc2d/id-preview-c33bd721--690a1256-6676-460f-acc1-0cfe17aec9a4.lovable.app-1780835126873.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Souqly — سوقلي | منصة الأعمال الفاخرة في مصر" },
      { name: "description", content: "سوقلي — منصة B2B فاخرة تربط الشركات والمصانع والموردين والمسوقين المحترفين في مصر. اكتشف الفرص، قدّم عروضك، ونمِّ أعمالك." },
      { property: "og:title", content: "Souqly — سوقلي | Egypt's Premier B2B Marketplace" },
      { property: "og:description", content: "One platform for companies, factories, wholesale, RFQs and tenders across Egypt." },
      { property: "og:url", content: "https://souqlymarket.com/" },
      { property: "og:image", content: HOME_OG_IMAGE },
      { name: "twitter:image", content: HOME_OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://souqlymarket.com/" }],
  }),
  component: Landing,
});

const categories = [
  { key: "cat_product", icon: Package, type: "product" },
  { key: "cat_service", icon: Wrench, type: "service" },
  { key: "cat_real_estate", icon: Building2, type: "real_estate" },
  { key: "cat_land", icon: Landmark, type: "land" },
  { key: "cat_factory", icon: Factory, type: "factory" },
  { key: "cat_opportunity", icon: TrendingUp, type: "opportunity" },
] as const;

function Empty({ label, href }: { label: string; href: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-surface/50 p-8 text-center">
      <p className="text-sm text-muted-foreground mb-3">{t("empty_no_items")}</p>
      <Button asChild variant="outline" size="sm"><Link to={href}>{label}</Link></Button>
    </div>
  );
}

function Skeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[1.5rem] border border-white/5 bg-surface-2/40 overflow-hidden animate-pulse">
          <div className="aspect-[4/3] bg-white/[0.03]" />
          <div className="p-4 space-y-2">
            <div className="h-3 rounded bg-white/[0.05] w-3/4" />
            <div className="h-3 rounded bg-white/[0.05] w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Landing() {
  const { t, dir, locale } = useI18n();
  const navigate = useNavigate();
  const ar = locale === "ar";
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;
  const [query, setQuery] = useState("");
  const [listings, setListings] = useState<ListingCardData[] | null>(null);
  const [companies, setCompanies] = useState<CompanyCardData[] | null>(null);
  const [wholesale, setWholesale] = useState<any[] | null>(null);
  const [rfqs, setRfqs] = useState<Array<{ id: string; title: string; governorate: string | null; budget_min: number | null; budget_max: number | null }> | null>(null);
  const [tenders, setTenders] = useState<Array<{ id: string; title: string; governorate: string | null; budget: number | null; deadline: string | null }> | null>(null);
  const [counts, setCounts] = useState({ companies: 0, listings: 0, agents: 0, leads: 0 });

  useEffect(() => {
    // Fast: counts for hero
    (async () => {
      const [cCount, lCount, aCount, leadCount] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("agents").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
      ]);
      setCounts({
        companies: cCount.count ?? 0,
        listings: lCount.count ?? 0,
        agents: aCount.count ?? 0,
        leads: leadCount.count ?? 0,
      });
    })();

    // Deferred: content sections
    (async () => {
      const listingSelect = "id, type, title_ar, title_en, images, price, currency, country, city, governorate, commission_percentage, featured, featured_until, company_id, companies(name_ar, name_en, phone, is_verified)";
      const [lRes, cRes, wRes, rfqRes, tenderRes] = await Promise.all([
        supabase.from("listings").select(listingSelect).eq("status", "approved").order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(8),
        supabase.from("companies").select("id, name_ar, name_en, industry, country, is_verified, logo_url").order("is_verified", { ascending: false }).limit(6),
        supabase.from("wholesale_listings").select("*, companies(name_ar, name_en, is_verified)").eq("active", true).order("created_at", { ascending: false }).limit(4),
        supabase.from("rfqs").select("id, title, governorate, budget_min, budget_max").eq("status", "open").order("created_at", { ascending: false }).limit(5),
        supabase.from("tenders").select("id, title, governorate, budget, deadline").eq("status", "open").order("created_at", { ascending: false }).limit(5),
      ]);
      setListings((lRes.data ?? []) as unknown as ListingCardData[]);
      setCompanies((cRes.data ?? []) as CompanyCardData[]);
      setWholesale((wRes.data ?? []) as any[]);
      setRfqs((rfqRes.data ?? []) as never);
      setTenders((tenderRes.data ?? []) as never);
    })();
  }, []);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) { navigate({ to: "/marketplace" }); return; }
    navigate({ to: "/search-all", search: { q } as never });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden hero-gradient">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
          backgroundImage: "linear-gradient(rgba(201,168,76,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.5) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }} />
        <div className="container-souqly relative py-20 md:py-28">
          <div className="max-w-4xl">
            <span className="status-pill mb-8">
              <Sparkles className="h-3 w-3" />{ar ? "منصة الأعمال الفاخرة في مصر" : "Egypt's Premier B2B Marketplace"}
            </span>
            <h1 className="text-serif text-5xl md:text-7xl lg:text-8xl leading-[1.02] tracking-tight text-foreground mb-6">
              {ar ? (<>حيث تلتقي <span className="gold-shine italic">الصفقات</span><br />بالشركات الجادة.</>)
                  : (<>Where serious <span className="gold-shine italic">deals</span><br />meet serious business.</>)}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-8">
              {ar
                ? "سوقلي يربط الشركات والموردين والمصانع والمسوقين المحترفين عبر مصر — في منصة واحدة، بمعايير فاخرة."
                : "Souqly connects companies, suppliers, factories and professional agents across Egypt — one platform, premium standards."}
            </p>

            {/* Hero Search */}
            <form onSubmit={submitSearch} className="premium-panel rounded-2xl p-2 flex items-center gap-2 max-w-2xl mb-6 focus-within:border-primary/40 transition">
              <div className="flex items-center gap-2 flex-1 px-3">
                <Search className="h-5 w-5 text-gold shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={ar ? "ابحث عن منتج، شركة، مصنع، عقار…" : "Search products, companies, factories, real estate…"}
                  className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground py-3 min-w-0"
                  aria-label={ar ? "بحث" : "Search"}
                />
              </div>
              <Button type="submit" size="lg" className="bg-primary text-primary-foreground hover:bg-primary-hover h-11 px-6 font-semibold shrink-0">
                {ar ? "بحث" : "Search"}
              </Button>
            </form>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="outline" className="h-11 px-6 gold-border bg-transparent hover:bg-white/5 text-foreground">
                <Link to="/auth" search={{ mode: "signup" }} className="gap-2">{ar ? "ابدأ مجاناً" : "Get Started"}<Arrow className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="h-11 px-6">
                <Link to="/how-it-works">{ar ? "كيف يعمل سوقلي؟" : "How it works"}</Link>
              </Button>
            </div>
          </div>

          {/* Bento stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: ar ? "شركة موثقة" : "Verified Companies", value: counts.companies },
              { label: ar ? "إعلان نشط" : "Active Listings", value: counts.listings },
              { label: ar ? "مسوّق محترف" : "Pro Agents", value: counts.agents },
              { label: ar ? "صفقة مسجلة" : "Recorded Deals", value: counts.leads },
            ].map((item) => (
              <div key={item.label} className="premium-panel rounded-2xl p-5 md:p-6">
                <div className="text-serif text-4xl md:text-5xl text-gold tabular-nums">{item.value.toLocaleString(ar ? "ar-EG" : "en-US")}<span className="text-gold-soft">+</span></div>
                <div className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-souqly py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="status-pill mb-3">{ar ? "التصنيفات" : "Categories"}</span>
            <h2 className="text-serif text-3xl md:text-5xl mt-3">{t("section_categories")}</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.map(({ key, icon: Icon }) => (
            <Link key={key} to="/marketplace" className="group premium-panel rounded-2xl p-6 hover:border-primary/40 hover:shadow-gold transition-all duration-300">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-gold grid place-items-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition">
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-sm font-semibold text-foreground">{t(key)}</div>
              <Arrow className="h-4 w-4 text-muted-foreground mt-3 group-hover:text-gold transition" />
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Listings */}
      <section className="container-souqly py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-serif text-3xl md:text-4xl">{t("section_featured")}</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/marketplace" className="gap-1">{t("cta_explore")} <Arrow className="h-4 w-4" /></Link></Button>
        </div>
        {listings === null ? <Skeleton count={8} />
          : listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {listings.map((l) => <ListingCard key={l.id} l={l} />)}
            </div>
          ) : <Empty label={t("cta_explore")} href="/marketplace" />}
      </section>

      {/* Top Companies */}
      <section className="container-souqly py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-serif text-3xl md:text-4xl">{t("section_top_companies")}</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/companies" className="gap-1">{t("nav_companies")} <Arrow className="h-4 w-4" /></Link></Button>
        </div>
        {companies === null ? <Skeleton count={6} />
          : companies.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((c) => <CompanyCard key={c.id} c={c} />)}
            </div>
          ) : <Empty label={t("nav_companies")} href="/companies" />}
      </section>

      {/* Wholesale */}
      <section className="container-souqly py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-serif text-3xl md:text-4xl">{ar ? "عروض الجملة" : "Wholesale offers"}</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/wholesale" className="gap-1">{t("view_all")} <Arrow className="h-4 w-4" /></Link></Button>
        </div>
        {wholesale === null ? <Skeleton count={4} />
          : wholesale.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {wholesale.map((w) => {
                const title = w.title ?? "";
                const company = (ar ? w.companies?.name_ar : w.companies?.name_en) ?? w.companies?.name_en ?? w.companies?.name_ar ?? "";
                return (
                  <Link key={w.id} to="/wholesale/$id" params={{ id: w.id }} className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-surface-2 shadow-elev transition-all duration-200 hover:-translate-y-1 hover:bg-surface">
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      {w.images?.[0] ? (
                        <img src={w.images[0]} alt={title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="h-full w-full bg-muted grid place-items-center text-muted-foreground text-sm">{ar ? "لا توجد صورة" : "No image"}</div>
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">{title}</h3>
                      {company && <p className="text-xs text-muted-foreground">{company}</p>}
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        {w.price_per_unit ? (
                          <div className="font-bold text-primary text-sm">{formatPrice(w.price_per_unit, locale)} <span className="text-xs text-muted-foreground font-normal">/ {ar ? "وحدة" : "unit"}</span></div>
                        ) : (<div className="text-xs text-muted-foreground">—</div>)}
                        <div className="text-xs text-muted-foreground">{ar ? "الحد الأدنى" : "MOQ"}: {w.moq}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : <Empty label={ar ? "تصفح الجملة" : "Browse wholesale"} href="/wholesale" />}
      </section>

      {/* Opportunities: RFQs & Tenders */}
      <section className="container-souqly py-16">
        <div className="mb-8">
          <span className="status-pill mb-3">{ar ? "فرص أعمال" : "Business Opportunities"}</span>
          <h2 className="text-serif text-3xl md:text-5xl mt-3">{ar ? "طلبات وعطاءات مفتوحة" : "Open RFQs & Tenders"}</h2>
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          {/* RFQs */}
          <div className="rounded-[1.5rem] panel-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{t("featured_rfqs")}</h3>
              <Button asChild variant="ghost" size="sm"><Link to="/rfq">{t("view_all")}</Link></Button>
            </div>
            {rfqs === null ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>
            ) : rfqs.length > 0 ? (
              <div className="space-y-3">
                {rfqs.map((r) => (
                  <Link key={r.id} to="/rfq/$id" params={{ id: r.id }} className="block rounded-xl border border-white/10 bg-surface p-4 hover:bg-surface-2 hover:border-primary/30 transition">
                    <div className="font-semibold text-sm line-clamp-1">{r.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {r.governorate ?? "—"} · {r.budget_min ? `${r.budget_min.toLocaleString()} - ${(r.budget_max ?? r.budget_min).toLocaleString()} EGP` : "—"}
                    </div>
                  </Link>
                ))}
              </div>
            ) : <Empty label={t("view_all")} href="/rfq" />}
          </div>

          {/* Tenders */}
          <div className="rounded-[1.5rem] panel-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{t("featured_tenders")}</h3>
              <Button asChild variant="ghost" size="sm"><Link to="/tenders">{t("view_all")}</Link></Button>
            </div>
            {tenders === null ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>
            ) : tenders.length > 0 ? (
              <div className="space-y-3">
                {tenders.map((r) => (
                  <Link key={r.id} to="/tenders/$id" params={{ id: r.id }} className="block rounded-xl border border-white/10 bg-surface p-4 hover:bg-surface-2 hover:border-primary/30 transition">
                    <div className="font-semibold text-sm line-clamp-1">{r.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {r.governorate ?? "—"} · {r.budget ? `${r.budget.toLocaleString()} EGP` : "—"} {r.deadline ? `· ${r.deadline}` : ""}
                    </div>
                  </Link>
                ))}
              </div>
            ) : <Empty label={t("view_all")} href="/tenders" />}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container-souqly py-20">
        <div className="premium-panel rounded-[2rem] p-10 md:p-16 text-center overflow-hidden relative">
          <div className="absolute inset-0 opacity-40 pointer-events-none" style={{
            background: "radial-gradient(circle at 50% 0%, rgba(201,168,76,0.15), transparent 60%)",
          }} />
          <div className="relative">
            <h2 className="text-serif text-4xl md:text-6xl mb-4">
              {ar ? <>جاهز تنقل أعمالك <span className="gold-shine italic">لمستوى تاني</span>؟</> : <>Ready to take your business <span className="gold-shine italic">further</span>?</>}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              {ar ? "انضم لآلاف الشركات والمسوقين على سوقلي — تسجيل مجاني، بدون عمولات مخفية." : "Join thousands of companies and pro agents on Souqly — free signup, no hidden fees."}
            </p>
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary-hover h-12 px-8 font-semibold">
              <Link to="/auth" search={{ mode: "signup" }} className="gap-2">{ar ? "ابدأ مجاناً الآن" : "Start Free Now"}<Arrow className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
