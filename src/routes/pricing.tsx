import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "Pricing — Souqly" }] }),
  component: Pricing,
});

function Pricing() {
  const { t } = useI18n();
  const plans = [
    { key: "plan_free", price: 0, desc: "plan_free_desc",
      features: ["feature_listings_5", "feature_basic_analytics", "feature_referral_basic"], highlight: false },
    { key: "plan_premium_company", price: 79, desc: "how_1_body",
      features: ["feature_listings_unlimited", "feature_featured_listings", "feature_advanced_analytics", "feature_priority_support"], highlight: true },
    { key: "plan_premium_agent", price: 29, desc: "how_2_body",
      features: ["feature_referral_unlimited", "feature_landing_pages", "feature_advanced_analytics", "feature_priority_support"], highlight: false },
  ] as const;

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
          {plans.map((p) => (
            <div key={p.key} className={`rounded-xl border bg-card p-8 ${p.highlight ? "border-primary shadow-elev ring-2 ring-primary/20" : "border-border shadow-card"}`}>
              <h3 className="font-bold text-lg">{t(p.key)}</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">{t(p.desc as never)}</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">${p.price}</span>
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
              <Button asChild className={`w-full ${p.highlight ? "bg-primary hover:bg-primary-hover" : ""}`} variant={p.highlight ? "default" : "outline"}>
                <Link to="/auth" search={{ mode: "signup" }}>{t("nav_signup")}</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
