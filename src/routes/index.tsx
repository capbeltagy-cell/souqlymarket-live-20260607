import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Building2, Factory, Landmark, Package, Search, Sparkles, TrendingUp, Wrench, BadgeCheck, MapPin } from "lucide-react";
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
  { key: "cat_product", icon: Package, to: "/marketplace" },
  { key: "cat_factory", icon: Factory, to: "/factories" },
  { key: "cat_real_estate", icon: Building2, to: "/real-estate" },
  { key: "cat_land", icon: Landmark, to: "/lands" },
  { key: "cat_service", icon: Wrench, to: "/marketplace" },
  { key: "cat_opportunity", icon: TrendingUp, to: "/marketplace" },
] as const;

type FactoryRow = {
  company_id: string;
  production_capacity: string | null;
  employees_range: string | null;
  verified: boolean;
  companies: { id: string; name_ar: string | null; name_en: string | null; industry: string | null; governorate: string | null; logo_url: string | null; is_verified: boolean | null } | null;
};

function CardSkeleton({ count = 4, aspect = "aspect-[4/3]" }: { count?: number; aspect?: string }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/5 bg-surface-2/40 overflow-hidden animate-pulse">
          <div className={`${aspect} bg-white/[0.03]`} />
          <div className="p-3 space-y-2">
            <div className="h-3 rounded bg-white/[0.05] w-3/4" />
            <div className="h-3 rounded bg-white/[0.05] w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionHead({ title, href, cta }: { title: string; href: string; cta: string }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-4">
      <h2 className="text-serif text-2xl md:text-4xl leading-tight">{title}</h2>
      <Link to={href} className="text-xs md:text-sm text-gold hover:text-gold-soft whitespace-nowrap font-medium">{cta} →</Link>
    </div>
  );
}

function Empty({ label, href }: { label: string; href: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-surface/40 p-6 text-center">
      <p className="text-sm text-muted-foreground mb-3">{t("empty_no_items")}</p>
      <Button asChild variant="outline" size="sm"><Link to={href}>{label}</Link></Button>
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
  const [factories, setFactories] = useState<FactoryRow[] | null>(null);
  const [opportunities, setOpportunities] = useState<ListingCardData[] | null>(null);
  const [wholesale, setWholesale] = useState<any[] | null>(null);
  const [counts, setCounts] = useState({ companies: 0, listings: 0, agents: 0 });

  useEffect(() => {
    (async () => {
      const [cCount, lCount, aCount] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("agents").select("id", { count: "exact", head: true }),
      ]);
      setCounts({ companies: cCount.count ?? 0, listings: lCount.count ?? 0, agents: aCount.count ?? 0 });
    })();

    (async () => {
      const listingSelect = "id, type, title_ar, title_en, images, price, currency, country, city, governorate, commission_percentage, featured, featured_until, company_id, companies(name_ar, name_en, is_verified)";
      const [lRes, oRes, cRes, fRes, wRes] = await Promise.all([
        supabase.from("listings").select(listingSelect).eq("status", "approved").eq("type", "product").order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(8),
        supabase.from("listings").select(listingSelect).eq("status", "approved").eq("type", "opportunity").order("created_at", { ascending: false }).limit(4),
        supabase.from("companies").select("id, name_ar, name_en, industry, country, is_verified, logo_url").order("is_verified", { ascending: false }).order("created_at", { ascending: false }).limit(6),
        supabase.from("factories").select("company_id, production_capacity, employees_range, verified, companies(id, name_ar, name_en, industry, governorate, logo_url, is_verified)").order("verified", { ascending: false }).limit(6),
        supabase.from("wholesale_listings").select("id, title, images, price_per_unit, currency, moq, governorate, companies(name_ar, name_en, is_verified)").eq("active", true).order("created_at", { ascending: false }).limit(4),
      ]);
      setListings((lRes.data ?? []) as unknown as ListingCardData[]);
      setOpportunities((oRes.data ?? []) as unknown as ListingCardData[]);
      setCompanies((cRes.data ?? []) as CompanyCardData[]);
      setFactories((fRes.data ?? []) as unknown as FactoryRow[]);
      setWholesale((wRes.data ?? []) as any[]);
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

      {/* 1. HERO + SEARCH */}
      <section className="relative overflow-hidden hero-gradient">
        <div className="container-souqly relative pt-8 pb-10 md:pt-20 md:pb-16">
          <span className="status-pill mb-4 fade-up text-[10px] md:text-xs">
            <Sparkles className="h-3 w-3" />{ar ? "منصة الأعمال الفاخرة في مصر" : "Egypt's Premier B2B Marketplace"}
          </span>
          <h1 className="text-serif text-[2.25rem] leading-[1.05] md:text-6xl lg:text-8xl tracking-tight text-foreground mb-4 md:mb-6 fade-up-1">
            {ar ? (<>حيث تلتقي <span className="gold-shine italic">الصفقات</span> بالشركات الجادة.</>)
                : (<>Where serious <span className="gold-shine italic">deals</span> meet serious business.</>)}
          </h1>
          <p className="text-sm md:text-lg text-muted-foreground max-w-2xl leading-relaxed mb-6 fade-up-2">
            {ar
              ? "سوقلي يربط الشركات والموردين والمصانع والمسوقين المحترفين عبر مصر — في منصة واحدة."
              : "Souqly connects companies, suppliers, factories and pro agents across Egypt — one platform."}
          </p>

          <form onSubmit={submitSearch} className="premium-panel rounded-2xl p-1.5 md:p-2 flex items-center gap-2 max-w-2xl focus-within:border-primary/40 focus-within:shadow-gold transition-all fade-up-3">
            <div className="flex items-center gap-2 flex-1 px-3 min-w-0">
              <Search className="h-4 w-4 md:h-5 md:w-5 text-gold shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={ar ? "ابحث عن منتج، شركة، مصنع…" : "Search products, companies, factories…"}
                className="flex-1 bg-transparent border-0 outline-none text-sm md:text-base text-foreground placeholder:text-muted-foreground py-2.5 md:py-3 min-w-0"
                aria-label={ar ? "بحث" : "Search"}
              />
            </div>
            <Button type="submit" size="sm" className="bg-primary text-primary-foreground hover:bg-primary-hover md:h-11 md:px-6 md:text-base font-semibold shrink-0">
              {ar ? "بحث" : "Search"}
            </Button>
          </form>

          {/* Compact stats — mobile: 3 tight tiles */}
          <div className="mt-6 md:mt-12 grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4 max-w-2xl">
            {[
              { label: ar ? "شركة" : "Companies", value: counts.companies },
              { label: ar ? "إعلان" : "Listings", value: counts.listings },
              { label: ar ? "مسوّق" : "Agents", value: counts.agents },
            ].map((item) => (
              <div key={item.label} className="premium-panel rounded-xl px-3 py-3 md:p-6">
                <div className="text-serif text-xl md:text-4xl text-gold tabular-nums leading-none">{item.value.toLocaleString(ar ? "ar-EG" : "en-US")}<span className="text-gold-soft">+</span></div>
                <div className="text-[10px] md:text-xs text-muted-foreground mt-1.5 uppercase tracking-wider">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. MAIN CATEGORIES — one clean strip */}
      <section className="container-souqly py-8 md:py-14">
        <h2 className="text-serif text-2xl md:text-4xl mb-4 md:mb-6">{t("section_categories")}</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
          {categories.map(({ key, icon: Icon, to }) => (
            <Link key={key} to={to} className="group premium-panel rounded-2xl p-3 md:p-5 flex flex-col items-center text-center gap-2 md:gap-3 hover:border-primary/40 hover:shadow-gold transition-all min-h-[92px]">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 text-gold grid place-items-center group-hover:bg-primary group-hover:text-primary-foreground transition">
                <Icon className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div className="text-[11px] md:text-sm font-semibold text-foreground leading-tight">{t(key)}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. FEATURED COMPANIES */}
      <section className="container-souqly py-6 md:py-10">
        <SectionHead title={t("section_top_companies")} href="/companies" cta={ar ? "الكل" : "All"} />
        {companies === null ? <CardSkeleton count={6} aspect="aspect-square" />
          : companies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {companies.map((c) => <CompanyCard key={c.id} c={c} />)}
            </div>
          ) : <Empty label={t("nav_companies")} href="/companies" />}
      </section>

      {/* 4. FEATURED FACTORIES */}
      <section className="container-souqly py-6 md:py-10">
        <SectionHead title={ar ? "المصانع المميزة" : "Featured factories"} href="/factories" cta={ar ? "الكل" : "All"} />
        {factories === null ? <CardSkeleton count={4} aspect="aspect-[4/3]" />
          : factories.filter(f => f.companies).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {factories.filter(f => f.companies).map((f) => {
                const c = f.companies!;
                const name = (ar ? c.name_ar : c.name_en) ?? c.name_en ?? c.name_ar ?? "—";
                return (
                  <Link key={f.company_id} to="/factories/$id" params={{ id: f.company_id }} className="premium-panel rounded-2xl p-4 md:p-5 hover:border-primary/40 hover:shadow-gold transition group">
                    <div className="flex items-start gap-3">
                      {c.logo_url ? (
                        <img src={c.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover shrink-0" loading="lazy" />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-primary/10 text-gold grid place-items-center shrink-0"><Factory className="h-5 w-5" /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <h3 className="font-semibold text-sm md:text-base truncate">{name}</h3>
                          {(c.is_verified || f.verified) && <BadgeCheck className="h-3.5 w-3.5 text-gold shrink-0" />}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{c.industry ?? "—"}</div>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                          {c.governorate && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.governorate}</span>}
                          {f.employees_range && <span>· {f.employees_range}</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : <Empty label={ar ? "تصفح المصانع" : "Browse factories"} href="/factories" />}
      </section>

      {/* 5. LATEST PRODUCTS */}
      <section className="container-souqly py-6 md:py-10">
        <SectionHead title={ar ? "أحدث المنتجات" : "Latest products"} href="/marketplace" cta={ar ? "الكل" : "All"} />
        {listings === null ? <CardSkeleton count={8} />
          : listings.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {listings.map((l) => <ListingCard key={l.id} l={l} />)}
            </div>
          ) : <Empty label={t("cta_explore")} href="/marketplace" />}
      </section>

      {/* 6. INVESTMENT OPPORTUNITIES */}
      {opportunities !== null && opportunities.length > 0 && (
        <section className="container-souqly py-6 md:py-10">
          <SectionHead title={ar ? "فرص استثمارية" : "Investment opportunities"} href="/marketplace" cta={ar ? "الكل" : "All"} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {opportunities.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        </section>
      )}

      {/* 7. WHOLESALE OFFERS */}
      <section className="container-souqly py-6 md:py-10">
        <SectionHead title={ar ? "عروض الجملة" : "Wholesale offers"} href="/wholesale" cta={ar ? "الكل" : "All"} />
        {wholesale === null ? <CardSkeleton count={4} />
          : wholesale.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {wholesale.map((w) => {
                const title = w.title ?? "";
                return (
                  <Link key={w.id} to="/wholesale/$id" params={{ id: w.id }} className="group overflow-hidden rounded-2xl border border-white/10 bg-surface-2 shadow-elev transition-all hover:-translate-y-0.5 hover:border-primary/30">
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      {w.images?.[0] ? (
                        <img src={w.images[0]} alt={title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="h-full w-full bg-muted grid place-items-center text-muted-foreground text-xs">{ar ? "لا توجد صورة" : "No image"}</div>
                      )}
                    </div>
                    <div className="p-3 space-y-1.5">
                      <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">{title}</h3>
                      <div className="flex items-center justify-between pt-1.5 border-t border-border text-[11px]">
                        {w.price_per_unit ? (
                          <div className="font-bold text-primary text-xs md:text-sm">{formatPrice(w.price_per_unit, locale)}</div>
                        ) : (<div className="text-muted-foreground">—</div>)}
                        <div className="text-muted-foreground">MOQ {w.moq}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : <Empty label={ar ? "تصفح الجملة" : "Browse wholesale"} href="/wholesale" />}
      </section>

      {/* 8. HOW SOUQLY WORKS */}
      <section className="container-souqly py-10 md:py-16">
        <div className="text-center max-w-2xl mx-auto mb-6 md:mb-10">
          <span className="status-pill mb-3 text-[10px]">{ar ? "بثلاث خطوات" : "In 3 steps"}</span>
          <h2 className="text-serif text-2xl md:text-5xl mt-3">{ar ? "من التسجيل لأول صفقة" : "From signup to your first deal"}</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-3 md:gap-5">
          {[
            { n: "01", t: ar ? "سجّل شركتك" : "Register your company", d: ar ? "أنشئ ملفًا موثقًا خلال دقائق واعرض قدراتك." : "Create a verified profile in minutes." },
            { n: "02", t: ar ? "استقبل الفرص" : "Receive opportunities", d: ar ? "طلبات أسعار ومناقصات مطابقة لنشاطك." : "Matched RFQs and tenders delivered to you." },
            { n: "03", t: ar ? "أغلق الصفقة" : "Close the deal", d: ar ? "تفاوض، وقّع، وادفع بأمان من داخل المنصة." : "Negotiate, sign, and pay securely on-platform." },
          ].map((s) => (
            <div key={s.n} className="premium-panel rounded-2xl p-5 md:p-8">
              <div className="step-number mb-3 md:mb-4 text-4xl md:text-6xl">{s.n}</div>
              <div className="divider-gold w-10 mb-3" />
              <h3 className="text-serif text-lg md:text-2xl mb-1.5">{s.t}</h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 9. CTA FOR COMPANIES */}
      <section className="container-souqly py-10 md:py-16">
        <div className="premium-panel rounded-2xl md:rounded-[2rem] p-6 md:p-14 text-center overflow-hidden relative">
          <div className="absolute inset-0 opacity-40 pointer-events-none" style={{
            background: "radial-gradient(circle at 50% 0%, rgba(201,168,76,0.15), transparent 60%)",
          }} />
          <div className="relative">
            <h2 className="text-serif text-2xl md:text-5xl mb-3 md:mb-4 leading-tight">
              {ar ? <>سجّل شركتك على سوقلي <span className="gold-shine italic">مجاناً</span></> : <>List your company on Souqly <span className="gold-shine italic">for free</span></>}
            </h2>
            <p className="text-xs md:text-base text-muted-foreground max-w-xl mx-auto mb-5 md:mb-8">
              {ar ? "انضم لآلاف الشركات والمصانع على سوقلي — بدون رسوم تسجيل، بدون عمولات مخفية." : "Join thousands of companies and factories on Souqly — no signup fees, no hidden charges."}
            </p>
            <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold shadow-gold">
                <Link to="/auth" search={{ mode: "signup" }} className="gap-2">{ar ? "سجّل شركتك الآن" : "Register your company"}<Arrow className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gold-border bg-transparent hover:bg-white/5">
                <Link to="/pricing">{ar ? "شاهد الأسعار" : "See pricing"}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
