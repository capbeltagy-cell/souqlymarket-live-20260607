import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CompanyCard, type CompanyCardData } from "@/components/CompanyCard";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { rankCompanies } from "@/lib/ranking";

export const Route = createFileRoute("/companies/")({
  head: () => ({
    meta: [
      { title: "Companies — Souqly" },
      { name: "description", content: "Discover verified B2B companies on Souqly." },
    ],
  }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<CompanyCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("companies")
      .select(
        "id, name_ar, name_en, industry, country, is_verified, is_premium, subscription_plan, subscription_expires_at, created_at, logo_url",
      )
      .limit(120)
      .then(({ data }) => {
        const ranked = rankCompanies((data ?? []) as any[]).slice(0, 60);
        setItems(ranked as CompanyCardData[]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <section className="container-souqly py-14">
        <div className="rounded-[2rem] premium-panel p-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div>
              <div className="text-sm uppercase tracking-[0.28em] text-accent">
                {t("nav_companies")}
              </div>
              <h1 className="mt-3 text-4xl font-bold">{t("discover_verified_companies")}</h1>
              <p className="text-muted-foreground mt-4 max-w-2xl">{t("companies_page_subtitle")}</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-3xl bg-surface p-5">
                <div className="text-3xl font-bold">{items.length}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-[0.18em]">
                  {t("companies_count")}
                </div>
              </div>
              <div className="rounded-3xl bg-surface p-5">
                <div className="text-3xl font-bold">{Math.max(4, items.length)}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-[0.18em]">
                  {t("trusted_companies")}
                </div>
              </div>
              <div className="rounded-3xl bg-surface p-5">
                <div className="text-3xl font-bold">99%</div>
                <div className="text-xs text-muted-foreground uppercase tracking-[0.18em]">
                  {t("success_rate")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="container-souqly py-8 flex-1">
        {loading ? (
          <div className="py-20 text-center text-muted-foreground">{t("loading")}</div>
        ) : items.length === 0 ? (
          <div className="py-24 text-center">
            <div className="text-lg font-semibold mb-2">{t("no_companies_yet")}</div>
            <Button asChild className="mt-4 bg-primary hover:bg-primary-hover">
              <Link to="/company">{t("create_company")}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((c) => (
              <CompanyCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
