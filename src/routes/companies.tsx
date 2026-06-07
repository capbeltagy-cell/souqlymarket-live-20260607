import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CompanyCard, type CompanyCardData } from "@/components/CompanyCard";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/companies")({
  head: () => ({ meta: [{ title: "Companies — Souqly" }, { name: "description", content: "Discover verified B2B companies on Souqly." }] }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<CompanyCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("companies")
      .select("id, name_ar, name_en, industry, country, is_verified, logo_url")
      .order("is_verified", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data }) => { setItems((data ?? []) as CompanyCardData[]); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="bg-surface-2 border-b border-border">
        <div className="container-souqly py-10">
          <h1 className="text-3xl font-bold">{t("nav_companies")}</h1>
          <p className="text-muted-foreground mt-2">{items.length} {t("companies_count")}</p>
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((c) => <CompanyCard key={c.id} c={c} />)}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
