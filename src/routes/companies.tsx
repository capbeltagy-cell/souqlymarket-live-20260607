import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CompanyCard } from "@/components/CompanyCard";
import { useI18n } from "@/i18n/I18nProvider";
import { sampleCompanies } from "@/lib/sampleData";

export const Route = createFileRoute("/companies")({
  head: () => ({ meta: [{ title: "Companies — Souqly" }, { name: "description", content: "Discover verified B2B companies on Souqly." }] }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="bg-surface-2 border-b border-border">
        <div className="container-souqly py-10">
          <h1 className="text-3xl font-bold">{t("nav_companies")}</h1>
          <p className="text-muted-foreground mt-2">{sampleCompanies.length}+ {t("companies_count")}</p>
        </div>
      </section>
      <section className="container-souqly py-8 flex-1">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sampleCompanies.map((c) => <CompanyCard key={c.id} c={c} />)}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
