import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Factory,
  Landmark,
  Megaphone,
  Package,
  Search,
  ShieldCheck,
  Store,
  Star,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { CompanyCard, type CompanyCardData } from "@/components/CompanyCard";
import { FeaturedAdBar } from "@/components/FeaturedAdBar";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";

const HOME_OG_IMAGE = "/icon.svg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Souqly — سوقلي | منصة الأعمال الفاخرة في مصر" },
      {
        name: "description",
        content:
          "سوقلي — منصة B2B فاخرة تربط الشركات والمصانع والموردين والمسوقين المحترفين في مصر. اكتشف الفرص، قدّم عروضك، ونمِّ أعمالك.",
      },
      { property: "og:title", content: "Souqly — سوقلي | Egypt's Premier B2B Marketplace" },
      {
        property: "og:description",
        content: "One platform for companies, factories, wholesale, RFQs and tenders across Egypt.",
      },
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

type RfqPreview = {
  id: string;
  title: string;
  quantity: number | null;
  unit: string | null;
  governorate: string | null;
  created_at: string;
};

type ReviewPreview = {
  id: string;
  comment: string | null;
  rating: number;
  companies: { name_ar: string | null; name_en: string | null } | null;
};

function CardSkeleton({ count = 4, aspect = "aspect-[4/3]" }: { count?: number; aspect?: string }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-surface-2/70 overflow-hidden animate-pulse"
        >
          <div className={`${aspect} bg-muted`} />
          <div className="p-3 space-y-2">
            <div className="h-3 rounded bg-border/70 w-3/4" />
            <div className="h-3 rounded bg-border/70 w-1/2" />
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
      <Link
        to={href}
        className="text-xs md:text-sm text-gold hover:text-gold-soft whitespace-nowrap font-medium"
      >
        {cta} →
      </Link>
    </div>
  );
}

function Empty({ label, href }: { label: string; href: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/80 p-6 text-center">
      <p className="text-sm text-muted-foreground mb-3">{t("empty_no_items")}</p>
      <Button asChild variant="outline" size="sm">
        <Link to={href}>{label}</Link>
      </Button>
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
  const [rfqs, setRfqs] = useState<RfqPreview[] | null>(null);
  const [reviews, setReviews] = useState<ReviewPreview[] | null>(null);
  const [counts, setCounts] = useState<{
    companies: number;
    listings: number;
    agents: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const [cCount, lCount, aCount] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved")
          .eq("visible_in_marketplace", true),
        supabase.from("agents").select("id", { count: "exact", head: true }),
      ]);
      if (!cCount.error && !lCount.error && !aCount.error) {
        setCounts({
          companies: cCount.count ?? 0,
          listings: lCount.count ?? 0,
          agents: aCount.count ?? 0,
        });
      }
    })();

    (async () => {
      const listingSelect =
        "id, type, title_ar, title_en, images, price, currency, country, city, governorate, commission_percentage, featured, featured_until, marketer_promotion_enabled, promotion_status, leads_count, created_at, company_id, companies(name_ar, name_en, is_verified, is_premium)";
      const [lRes, cRes, rRes, reviewRes] = await Promise.all([
        supabase
          .from("listings")
          .select(listingSelect)
          .eq("status", "approved")
          .eq("visible_in_marketplace", true)
          .eq("type", "product")
          .order("created_at", { ascending: false })
          .limit(40),
        supabase
          .from("companies")
          .select("id, name_ar, name_en, industry, country, is_verified, is_premium, logo_url")
          .order("is_premium", { ascending: false })
          .order("is_verified", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("rfqs")
          .select("id, title, quantity, unit, governorate, created_at")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("reviews")
          .select("id, comment, rating, companies(name_ar, name_en)")
          .not("comment", "is", null)
          .order("created_at", { ascending: false })
          .limit(3),
      ]);
      const { rankListings } = await import("@/lib/ranking");
      setListings(rankListings((lRes.data ?? []) as unknown as ListingCardData[]).slice(0, 8));
      setCompanies((cRes.data ?? []) as CompanyCardData[]);
      setRfqs((rRes.data ?? []) as unknown as RfqPreview[]);
      setReviews((reviewRes.data ?? []) as unknown as ReviewPreview[]);
    })();
  }, []);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      navigate({ to: "/marketplace" });
      return;
    }
    navigate({ to: "/search-all", search: { q } as never });
  }

  return (
    <PublicLayout>
      {/* 1. HERO + SEARCH — compact */}
      <section className="relative overflow-hidden hero-gradient">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-orb hero-orb-a" aria-hidden="true" />
        <div className="hero-orb hero-orb-b" aria-hidden="true" />
        <div className="hero-ring hero-ring-a" aria-hidden="true" />
        <div className="hero-ring hero-ring-b" aria-hidden="true" />
        <div className="container-souqly relative z-10 pt-8 pb-10 md:pt-20 md:pb-16">
          <span className="status-pill mb-3 fade-up text-[10px] md:text-xs">
            <Sparkles className="h-3 w-3" />
            {ar ? "منصة الأعمال الفاخرة في مصر" : "Egypt's Premier B2B Marketplace"}
          </span>
          <h1 className="text-serif text-[2.25rem] leading-[1.08] md:text-6xl lg:text-7xl tracking-tight text-foreground mb-4 fade-up-1 max-w-5xl">
            {ar ? (
              <>
                حيث تلتقي <span className="gold-shine italic">الصفقات</span> بالشركات الجادة.
              </>
            ) : (
              <>
                Where serious <span className="gold-shine italic">deals</span> meet serious
                business.
              </>
            )}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed mb-5 fade-up-2">
            {ar
              ? "سوقلي يربط الشركات والموردين والمصانع والمسوقين المحترفين عبر مصر."
              : "Souqly connects companies, suppliers, factories and pro agents across Egypt."}
          </p>

          <form
            onSubmit={submitSearch}
            className="premium-panel rounded-2xl p-1.5 md:p-2 flex items-center gap-2 max-w-2xl focus-within:border-primary/40 focus-within:shadow-gold transition-all fade-up-3"
          >
            <div className="flex items-center gap-2 flex-1 px-3 min-w-0">
              <Search className="h-4 w-4 md:h-5 md:w-5 text-gold shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  ar ? "ابحث عن منتج، شركة، مصنع…" : "Search products, companies, factories…"
                }
                className="flex-1 bg-transparent border-0 outline-none text-sm md:text-base text-foreground placeholder:text-muted-foreground py-2.5 md:py-3 min-w-0"
                aria-label={ar ? "بحث" : "Search"}
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary-hover md:h-11 md:px-6 md:text-base font-semibold shrink-0"
            >
              {ar ? "بحث" : "Search"}
            </Button>
          </form>

          <div className="mt-4 flex flex-col gap-2 fade-up-3 sm:flex-row sm:items-center">
            <Button
              asChild
              size="lg"
              className="group h-12 justify-center rounded-xl bg-gold px-5 font-bold text-background shadow-gold transition-all hover:-translate-y-0.5 hover:bg-gold-soft sm:w-auto"
            >
              <Link to="/store/open">
                <Store className="me-2 h-5 w-5" />
                {ar ? "أنشئ متجرك الآن" : "Create your store now"}
                <Arrow className="ms-2 h-4 w-4 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </Link>
            </Button>
            <Link
              to="/stores"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-5 text-sm font-semibold text-foreground transition hover:border-gold/40 hover:bg-gold/5"
            >
              {ar ? "تصفح المتاجر" : "Browse stores"}
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 fade-up-3">
            <Link to="/marketplace" className="hero-quick-link">
              <Package className="h-3.5 w-3.5" /> {ar ? "تسوّق الآن" : "Shop now"}
            </Link>
            <Link to="/rfq" className="hero-quick-link">
              <TrendingUp className="h-3.5 w-3.5" /> {ar ? "طلبات الأسعار" : "Price requests"}
            </Link>
            <Link to="/earn" className="hero-quick-link">
              <Megaphone className="h-3.5 w-3.5" /> {ar ? "فرص المسوقين" : "Marketer opportunities"}
            </Link>
          </div>

          {/* Compact stats — desktop only, hidden on mobile to reduce clutter */}
          {counts && (
            <div className="mt-8 hidden md:grid grid-cols-3 gap-4 max-w-2xl">
              {[
                { label: ar ? "شركة" : "Companies", value: counts.companies },
                { label: ar ? "إعلان" : "Listings", value: counts.listings },
                { label: ar ? "مسوّق" : "Agents", value: counts.agents },
              ].map((item) => (
                <div key={item.label} className="premium-panel rounded-xl p-6">
                  <div className="text-serif text-4xl text-gold tabular-nums leading-none">
                    {item.value.toLocaleString(ar ? "ar-EG" : "en-US")}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5 uppercase tracking-wider">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 2. FEATURED ADVERTISEMENT BAR */}
      <FeaturedAdBar />

      <section className="border-y border-border/70 bg-surface/45">
        <div className="container-souqly grid grid-cols-3 divide-x divide-x-reverse divide-border/70 py-3 md:py-4">
          {[
            { icon: ShieldCheck, ar: "تعاملات داخل المنصة", en: "On-platform deals" },
            { icon: BadgeCheck, ar: "شركات قابلة للتوثيق", en: "Verified businesses" },
            { icon: Users, ar: "مسوقون بنظام العمولة", en: "Commission marketers" },
          ].map(({ icon: Icon, ar: arLabel, en }) => (
            <div
              key={en}
              className="flex items-center justify-center gap-2 px-2 text-center text-[10px] font-semibold text-muted-foreground md:text-sm"
            >
              <Icon className="h-4 w-4 shrink-0 text-gold" />
              <span>{ar ? arLabel : en}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. MAIN CATEGORIES */}
      <section className="container-souqly py-6 md:py-10">
        <h2 className="text-serif text-xl md:text-3xl mb-3 md:mb-5">{t("section_categories")}</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
          {categories.map(({ key, icon: Icon, to }) => (
            <Link
              key={key}
              to={to}
              className="group premium-panel category-tile rounded-2xl p-3 md:p-5 flex flex-col items-center text-center gap-2 md:gap-3 hover:border-primary/50 hover:shadow-gold transition-all min-h-[88px]"
            >
              <div className="h-9 w-9 md:h-12 md:w-12 rounded-xl bg-primary/10 text-primary grid place-items-center group-hover:bg-primary group-hover:text-primary-foreground transition shadow-[0_0_30px_-12px_var(--primary)]">
                <Icon className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div className="text-[11px] md:text-sm font-semibold text-foreground leading-tight">
                {t(key)}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-souqly py-6 md:py-10">
        <div className="mb-5 max-w-2xl">
          <span className="status-pill mb-3">
            {ar ? "ابدأ من مكانك الصحيح" : "Choose your path"}
          </span>
          <h2 className="text-serif text-2xl md:text-4xl">
            {ar ? "سوقلي مبني للشركات والمسوقين معًا" : "Built for businesses and marketers"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {ar
              ? "اختر دورك وستصل مباشرة للأدوات والفرص المناسبة لك، بدون قوائم معقدة."
              : "Pick your role and go directly to the tools and opportunities made for you."}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 md:gap-5">
          <Link to="/auth" search={{ mode: "signup" }} className="role-entry group">
            <div className="role-entry-icon">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg md:text-2xl">{ar ? "أنا شركة أو مصنع" : "I'm a business"}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground md:text-sm">
                {ar
                  ? "اعرض منتجاتك، استقبل الطلبات، وأنشئ حملات تسويق بالعمولة."
                  : "List products, receive orders, and launch commission campaigns."}
              </p>
            </div>
            <Arrow className="h-5 w-5 shrink-0 text-gold transition-transform group-hover:-translate-x-1" />
          </Link>
          <Link to="/earn" className="role-entry group">
            <div className="role-entry-icon">
              <Megaphone className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg md:text-2xl">{ar ? "أنا مسوّق" : "I'm a marketer"}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground md:text-sm">
                {ar
                  ? "اختر فرصًا حقيقية، شارك رابطك، وتابع عمولاتك وسحوباتك."
                  : "Choose real opportunities, share your link, and track earnings."}
              </p>
            </div>
            <Arrow className="h-5 w-5 shrink-0 text-gold transition-transform group-hover:-translate-x-1" />
          </Link>
        </div>
      </section>

      {/* 4. LATEST COMPANIES */}
      <section className="container-souqly py-6 md:py-8">
        <SectionHead
          title={t("section_top_companies")}
          href="/companies"
          cta={ar ? "الكل" : "All"}
        />
        {companies === null ? (
          <CardSkeleton count={6} aspect="aspect-square" />
        ) : companies.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {companies.map((c) => (
              <CompanyCard key={c.id} c={c} />
            ))}
          </div>
        ) : (
          <Empty label={t("nav_companies")} href="/companies" />
        )}
      </section>

      {/* 5. LATEST PRODUCTS */}
      <section className="container-souqly py-6 md:py-8">
        <SectionHead
          title={ar ? "أحدث المنتجات" : "Latest products"}
          href="/marketplace"
          cta={ar ? "الكل" : "All"}
        />
        {listings === null ? (
          <CardSkeleton count={8} />
        ) : listings.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {listings.map((l) => (
              <ListingCard key={l.id} l={l} />
            ))}
          </div>
        ) : (
          <Empty label={t("cta_explore")} href="/marketplace" />
        )}
      </section>

      {/* 6. LATEST RFQS — production records only */}
      <section className="container-souqly py-6 md:py-8">
        <SectionHead
          title={ar ? "أحدث طلبات الأسعار" : "Latest RFQs"}
          href="/rfq"
          cta={ar ? "عرض الكل" : "View all"}
        />
        {rfqs === null ? (
          <CardSkeleton count={4} aspect="aspect-[2/1]" />
        ) : rfqs.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {rfqs.map((rfq) => (
              <Link
                key={rfq.id}
                to="/rfq/$id"
                params={{ id: rfq.id }}
                className="rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary/50"
              >
                <span className="text-xs font-semibold text-primary">
                  {rfq.governorate || (ar ? "كل مصر" : "Egypt")}
                </span>
                <h3 className="mt-3 line-clamp-2 text-lg font-bold leading-snug">{rfq.title}</h3>
                {(rfq.quantity || rfq.unit) && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {rfq.quantity ?? "—"} {rfq.unit ?? ""}
                  </p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <Empty label={ar ? "أنشئ طلب سعر" : "Create an RFQ"} href="/rfq/new" />
        )}
      </section>

      {/* 7. VERIFIED CUSTOMER REVIEWS — no fabricated testimonials */}
      {reviews && reviews.length > 0 && (
        <section className="border-y border-border bg-surface-2/50">
          <div className="container-souqly py-10 md:py-14">
            <h2 className="text-serif text-2xl md:text-4xl">
              {ar ? "تقييمات حقيقية من المنصة" : "Real platform reviews"}
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-card"
                >
                  <div className="flex gap-1 text-gold" aria-label={`${review.rating} / 5`}>
                    {Array.from({ length: Math.max(0, Math.min(5, review.rating)) }).map(
                      (_, index) => (
                        <Star key={index} className="h-4 w-4 fill-current" />
                      ),
                    )}
                  </div>
                  <p className="mt-4 line-clamp-4 text-sm leading-7 text-foreground">
                    “{review.comment}”
                  </p>
                  <p className="mt-4 text-xs font-semibold text-muted-foreground">
                    {review.companies?.name_ar ||
                      review.companies?.name_en ||
                      (ar ? "شركة على سوقلي" : "A Souqly company")}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 8. HOW SOUQLY WORKS */}
      <section className="container-souqly py-10 md:py-16">
        <div className="text-center max-w-2xl mx-auto mb-6 md:mb-10">
          <span className="status-pill mb-3 text-[10px]">{ar ? "بثلاث خطوات" : "In 3 steps"}</span>
          <h2 className="text-serif text-2xl md:text-5xl mt-3">
            {ar ? "من التسجيل لأول صفقة" : "From signup to your first deal"}
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-3 md:gap-5">
          {[
            {
              n: "01",
              t: ar ? "سجّل شركتك" : "Register your company",
              d: ar
                ? "أنشئ ملفًا موثقًا خلال دقائق واعرض قدراتك."
                : "Create a verified profile in minutes.",
            },
            {
              n: "02",
              t: ar ? "استقبل الفرص" : "Receive opportunities",
              d: ar
                ? "طلبات أسعار ومناقصات مطابقة لنشاطك."
                : "Matched RFQs and tenders delivered to you.",
            },
            {
              n: "03",
              t: ar ? "أغلق الصفقة" : "Close the deal",
              d: ar
                ? "تفاوض، وقّع، وادفع بأمان من داخل المنصة."
                : "Negotiate, sign, and pay securely on-platform.",
            },
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
      <section className="container-souqly py-10 md:py-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="status-pill">{ar ? "أسئلة شائعة" : "FAQ"}</span>
          <h2 className="mt-4 text-serif text-3xl md:text-5xl">
            {ar ? "قبل أن تبدأ" : "Before you start"}
          </h2>
        </div>
        <div className="mx-auto mt-7 grid max-w-4xl gap-3">
          {[
            [
              ar ? "هل التسجيل مجاني؟" : "Is registration free?",
              ar
                ? "يمكن إنشاء الحساب وملف الشركة مجانًا، وتظهر أي خطط مدفوعة وأسعارها بوضوح قبل الاشتراك."
                : "You can create an account and company profile for free. Any paid plan is shown clearly before subscribing.",
            ],
            [
              ar ? "كيف أطلب أسعارًا من الموردين؟" : "How do I request supplier quotes?",
              ar
                ? "أنشئ RFQ وحدد الكمية والموقع والموعد، ثم استقبل عروض الموردين وقارنها."
                : "Create an RFQ with quantity, location and deadline, then receive and compare supplier offers.",
            ],
            [
              ar ? "هل الشركات والمنتجات شيء واحد؟" : "Are companies and products the same?",
              ar
                ? "لا. لكل شركة ملف مستقل، ويمكن أن يتبعه متجر ومنتجات وخدمات ومصانع وفروع."
                : "No. Every company has its own profile and may have a store, products, services, factories and branches.",
            ],
          ].map(([question, answer]) => (
            <details
              key={question}
              className="group rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <summary className="cursor-pointer list-none font-semibold">{question}</summary>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="container-souqly py-10 md:py-16">
        <div className="premium-panel rounded-2xl md:rounded-[2rem] p-6 md:p-14 text-center overflow-hidden relative">
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 50% 0%, rgba(201,168,76,0.15), transparent 60%)",
            }}
          />
          <div className="relative">
            <h2 className="text-serif text-2xl md:text-5xl mb-3 md:mb-4 leading-tight">
              {ar ? (
                <>
                  سجّل شركتك على سوقلي <span className="gold-shine italic">مجاناً</span>
                </>
              ) : (
                <>
                  List your company on Souqly <span className="gold-shine italic">for free</span>
                </>
              )}
            </h2>
            <p className="text-xs md:text-base text-muted-foreground max-w-xl mx-auto mb-5 md:mb-8">
              {ar
                ? "انضم إلى الشركات والمصانع التي تبني حضورها على سوقلي — بدون رسوم تسجيل أو عمولات مخفية."
                : "Join companies and factories building their presence on Souqly — no signup fees or hidden charges."}
            </p>
            <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold shadow-gold"
              >
                <Link to="/auth" search={{ mode: "signup" }} className="gap-2">
                  {ar ? "سجّل شركتك الآن" : "Register your company"}
                  <Arrow className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="gold-border bg-transparent hover:bg-white/5"
              >
                <Link to="/pricing">{ar ? "شاهد الأسعار" : "See pricing"}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
