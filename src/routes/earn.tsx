import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { DollarSign, Share2, TrendingUp, Wallet, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/earn")({
  head: () => ({
    meta: [
      { title: "اربح مع سوقلي — Souqly Marketers Program" },
      {
        name: "description",
        content:
          "انضم لبرنامج المسوقين في سوقلي واكسب عمولات على كل صفقة تُتَم عبر رابطك — الشركة تربح عملاء، الزبون يربح ثقة، وأنت تربح دخلاً.",
      },
      { property: "og:title", content: "اربح مع سوقلي — Souqly Marketers Program" },
      {
        property: "og:description",
        content: "عمولات فورية على كل صفقة، أدوات مشاركة سريعة، ومحفظة رقمية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EarnPage,
});

function EarnPage() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const ar = locale === "ar";
  const navigate = useNavigate();

  // If logged-in user already has a marketer profile, send them straight to dashboard.
  useEffect(() => {
    if (!user) return;
    supabase
      .from("agents")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.id) navigate({ to: "/dashboard", replace: true });
      });
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_oklab,var(--accent)_25%,transparent),transparent_60%),radial-gradient(circle_at_80%_60%,color-mix(in_oklab,var(--primary)_20%,transparent),transparent_60%)]" />
        <div className="container-souqly relative py-16 md:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent">
              <DollarSign className="h-3.5 w-3.5" />
              {ar ? "برنامج المسوقين" : "Marketers Program"}
            </span>
            <h1 className="mt-6 text-4xl md:text-6xl font-bold leading-tight tracking-tight">
              {ar ? (
                <>
                  اكسب <span className="text-accent">عمولة فورية</span>
                  <br />
                  على كل صفقة تتم عبرك
                </>
              ) : (
                <>
                  Earn <span className="text-accent">instant commission</span>
                  <br />
                  on every deal closed through you
                </>
              )}
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
              {ar
                ? "شارك إعلانات الشركات على واتساب وفيسبوك عبر رابطك الخاص. لما العميل يشتري، تُقيَّد عمولتك مباشرة في محفظتك الرقمية بدون تعقيد."
                : "Share company listings on WhatsApp and Facebook through your unique link. When a customer buys, your commission is credited straight to your digital wallet — no paperwork."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <>
                  <Button
                    asChild
                    size="lg"
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    <Link to="/agent">{ar ? "أنشئ ملف المسوّق" : "Create marketer profile"}</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/marketplace">
                      {ar ? "تصفّح الإعلانات وابدأ" : "Browse listings"}
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    asChild
                    size="lg"
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    <Link to="/auth" search={{ mode: "signup" }}>
                      {ar ? "سجّل مجانًا وابدأ" : "Sign up free"}
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/how-it-works">{ar ? "كيف يعمل" : "How it works"}</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="container-souqly py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">
            {ar ? "3 خطوات وتبدأ الربح" : "3 steps to start earning"}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {ar
              ? "بدون رأس مال، بدون مخزون، وبدون خبرة سابقة."
              : "No capital, no inventory, no prior experience needed."}
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Users,
              n: "1",
              t: ar ? "أنشئ ملفك" : "Create your profile",
              d: ar
                ? "سجّل حساب وأضف ملف المسوّق. مجاني تمامًا — تحصل على محفظة رقمية فور التسجيل."
                : "Sign up and add your marketer profile. 100% free — a digital wallet is opened instantly.",
            },
            {
              icon: Share2,
              n: "2",
              t: ar ? "ولّد رابطك وشاركه" : "Generate & share your link",
              d: ar
                ? "من أي إعلان اضغط «احصل على رابطي واربح» وشاركه على واتساب أو فيسبوك بضغطة."
                : "On any listing tap “Get my link & earn” and share to WhatsApp or Facebook in one click.",
            },
            {
              icon: Wallet,
              n: "3",
              t: ar ? "استلم عمولتك" : "Get paid",
              d: ar
                ? "عند إتمام الصفقة، تُقيَّد عمولتك تلقائيًا في محفظتك واطلب السحب متى شئت."
                : "When the deal closes, commission auto-credits to your wallet. Request payout anytime.",
            },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground font-bold">
                  {s.n}
                </span>
                <s.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Everyone wins */}
      <section className="border-y border-border bg-surface-2">
        <div className="container-souqly py-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">{ar ? "الكل يكسب" : "Everyone wins"}</h2>
            <p className="mt-3 text-muted-foreground">
              {ar
                ? "نموذج ثلاثي عادل — لا خسائر، فقط نمو مشترك."
                : "A fair triangular model — no losses, only shared growth."}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: ar ? "المسوّق" : "The marketer",
                accent: "text-accent",
                items: ar
                  ? [
                      "عمولة على كل صفقة",
                      "محفظة رقمية فورية",
                      "أدوات مشاركة جاهزة",
                      "تتبّع الأداء بشفافية",
                    ]
                  : [
                      "Commission on every deal",
                      "Instant digital wallet",
                      "Ready share tools",
                      "Transparent tracking",
                    ],
              },
              {
                title: ar ? "الشركة" : "The company",
                accent: "text-primary",
                items: ar
                  ? [
                      "وصول لعملاء جدد",
                      "دفع مقابل النتائج فقط",
                      "علامة توثيق تبني الثقة",
                      "لوحة تحليلات كاملة",
                    ]
                  : [
                      "New customer reach",
                      "Pay only for results",
                      "Verified badge builds trust",
                      "Full analytics dashboard",
                    ],
              },
              {
                title: ar ? "الزبون" : "The customer",
                accent: "text-success",
                items: ar
                  ? [
                      "شركات موثّقة فقط",
                      "أسعار تنافسية",
                      "دعم مباشر داخل المنصة",
                      "حماية بيانات كاملة",
                    ]
                  : [
                      "Verified companies only",
                      "Competitive prices",
                      "In-platform support",
                      "Full data protection",
                    ],
              },
            ].map((col) => (
              <div
                key={col.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-card"
              >
                <h3 className={`text-xl font-bold ${col.accent}`}>{col.title}</h3>
                <ul className="mt-4 space-y-2 text-sm">
                  {col.items.map((it) => (
                    <li key={it} className="flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 mt-0.5 text-success shrink-0" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission math */}
      <section className="container-souqly py-16">
        <div className="max-w-4xl mx-auto rounded-3xl border border-border bg-gradient-to-br from-card to-surface-2 p-8 md:p-12 shadow-elev">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <TrendingUp className="h-8 w-8 text-accent mb-4" />
              <h2 className="text-3xl font-bold mb-3">{ar ? "احسبها بنفسك" : "Do the math"}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {ar
                  ? "متوسط الصفقة 25,000 جنيه × عمولة 5% = 1,250 جنيه لك من صفقة واحدة. 4 صفقات شهريًا = 5,000 جنيه دخل إضافي — بدون مخزون أو مخاطرة."
                  : "Average deal EGP 25,000 × 5% commission = EGP 1,250 per closed deal. 4 deals/month = EGP 5,000 extra income — with zero inventory or risk."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { k: ar ? "متوسط الصفقة" : "Avg deal", v: "25,000" },
                { k: ar ? "عمولتك %" : "Your %", v: "5%" },
                { k: ar ? "لكل صفقة" : "Per deal", v: "1,250" },
                { k: ar ? "شهريًا" : "Monthly", v: "5,000+" },
              ].map((s) => (
                <div
                  key={s.k}
                  className="rounded-xl bg-background/60 border border-border p-4 text-center"
                >
                  <div className="text-2xl font-bold text-accent">{s.v}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.k}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-souqly pb-20">
        <div className="rounded-3xl bg-primary text-primary-foreground p-10 md:p-14 text-center shadow-gold">
          <h2 className="text-3xl md:text-4xl font-bold">
            {ar ? "جاهز تبدأ اليوم؟" : "Ready to start today?"}
          </h2>
          <p className="mt-3 opacity-90 max-w-xl mx-auto">
            {ar
              ? "التسجيل مجاني، ومحفظتك جاهزة خلال دقائق. فرصتك تبدأ من هنا."
              : "Registration is free and your wallet is ready in minutes. Your opportunity starts here."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {user ? (
              <Button asChild size="lg" variant="secondary">
                <Link to="/agent">{ar ? "أكمل ملف المسوّق" : "Complete marketer profile"}</Link>
              </Button>
            ) : (
              <Button asChild size="lg" variant="secondary">
                <Link to="/auth" search={{ mode: "signup" }}>
                  {ar ? "سجّل مجانًا" : "Sign up free"}
                </Link>
              </Button>
            )}
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link to="/marketplace">{ar ? "تصفّح الإعلانات" : "Browse listings"}</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
