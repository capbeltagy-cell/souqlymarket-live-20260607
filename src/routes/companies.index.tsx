import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicLayout } from "@/components/layouts/PublicLayout";
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
    links: [{ rel: "canonical", href: "https://souqlymarket.com/companies" }],
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
    <PublicLayout mainClassName="bg-surface-2">
      <section className="container-souqly py-8 md:py-10">
        <div className="rounded-2xl premium-panel p-5 md:p-7">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div>
              <div className="text-sm uppercase tracking-[0.28em] text-accent">
                {t("nav_companies")}
              </div>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">
                {t("discover_verified_companies")}
              </h1>
              <p className="text-muted-foreground mt-4 max-w-2xl">{t("companies_page_subtitle")}</p>
            </div>
            {items.length > 0 && (
              <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-2">
                <div className="rounded-2xl bg-surface p-4">
                  <div className="text-3xl font-bold">{items.length}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-[0.18em]">
                    {t("companies_count")}
                  </div>
                </div>
                <div className="rounded-2xl bg-surface p-4">
                  <div className="text-3xl font-bold">
                    {items.filter((item) => item.is_verified).length}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-[0.18em]">
                    {t("trusted_companies")}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="container-souqly flex-1 pb-10">
        {loading ? (
          <div className="py-20 text-center text-muted-foreground">{t("loading")}</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center shadow-card">
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
    </PublicLayout>
  );
}
