import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";
import { getMyPlan, upgradePlan, type PlanKey } from "@/lib/billing.functions";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Souqly B2B subscription plans" },
      { name: "description", content: "Choose the Souqly plan that fits your business: Free, Premium Company, or Premium Agent." },
      { property: "og:title", content: "Souqly Pricing" },
      { property: "og:description", content: "Subscription plans for companies and sales agents on the Souqly B2B marketplace." },
    ],
  }),
  component: Pricing,
});

const PLANS: { key: PlanKey; titleKey: string; price: number; desc: string; features: string[]; highlight: boolean }[] = [
  { key: "free", titleKey: "plan_free", price: 0, desc: "plan_free_desc",
    features: ["feature_listings_5", "feature_basic_analytics", "feature_referral_basic"], highlight: false },
  { key: "premium_company", titleKey: "plan_premium_company", price: 79, desc: "how_1_body",
    features: ["feature_listings_unlimited", "feature_featured_listings", "feature_advanced_analytics", "feature_priority_support"], highlight: true },
  { key: "premium_agent", titleKey: "plan_premium_agent", price: 29, desc: "how_2_body",
    features: ["feature_referral_unlimited", "feature_landing_pages", "feature_advanced_analytics", "feature_priority_support"], highlight: false },
];

function Pricing() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const fetchPlan = useServerFn(getMyPlan);
  const upgrade = useServerFn(upgradePlan);
  const [current, setCurrent] = useState<PlanKey | null>(null);
  const [busy, setBusy] = useState<PlanKey | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchPlan().then((r) => setCurrent(r.plan)).catch(() => {});
  }, [user, fetchPlan]);

  const onUpgrade = async (plan: PlanKey) => {
    setBusy(plan);
    try {
      await upgrade({ data: { plan } });
      setCurrent(plan);
      toast.success(t("upgraded_success"));
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="bg-surface-2 border-b border-border">
        <div className="container-souqly py-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold">{t("section_pricing")}</h1>
          <p className="text-muted-foreground mt-2">{t("tagline")}</p>
        </div>
      </section>
      <section className="container-souqly py-12 flex-1">
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((p) => {
            const isCurrent = current === p.key;
            return (
              <div key={p.key} className={`rounded-xl border bg-card p-8 relative ${p.highlight ? "border-primary shadow-elev ring-2 ring-primary/20" : "border-border shadow-card"}`}>
                {isCurrent && (
                  <Badge className="absolute -top-2 end-4 bg-success text-success-foreground hover:bg-success">{t("current_plan")}</Badge>
                )}
                <h2 className="font-bold text-lg">{t(p.titleKey as never)}</h2>
                <p className="text-sm text-muted-foreground mt-1 mb-4">{t(p.desc as never)}</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold">{p.price === 0 ? (locale === "ar" ? "مجاناً" : "Free") : (locale === "ar" ? `${p.price.toLocaleString("ar-EG")} جنيه` : `EGP ${p.price.toLocaleString()}`)}</span>
                  <span className="text-muted-foreground">{t("monthly")}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                      <span>{t(f as never)}</span>
                    </li>
                  ))}
                </ul>
                {!user ? (
                  <Button asChild className={`w-full ${p.highlight ? "bg-primary hover:bg-primary-hover" : ""}`} variant={p.highlight ? "default" : "outline"}>
                    <Link to="/auth" search={{ mode: "signup" }}>{t("nav_signup")}</Link>
                  </Button>
                ) : isCurrent ? (
                  <Button className="w-full" variant="outline" disabled>{t("current_plan")}</Button>
                ) : (
                  <Button className={`w-full gap-2 ${p.highlight ? "bg-primary hover:bg-primary-hover" : ""}`}
                    variant={p.highlight ? "default" : "outline"}
                    onClick={() => onUpgrade(p.key)} disabled={busy === p.key}>
                    <Sparkles className="h-4 w-4" />{t("upgrade")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
