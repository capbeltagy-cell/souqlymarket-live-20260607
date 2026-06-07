import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BadgeCheck, MapPin, Mail, Globe } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/ListingCard";
import { useI18n } from "@/i18n/I18nProvider";
import { sampleCompanies, sampleListings } from "@/lib/sampleData";

export const Route = createFileRoute("/companies/$id")({
  loader: ({ params }) => {
    const company = sampleCompanies.find((c) => c.id === params.id);
    if (!company) throw notFound();
    return { company };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.company.name_en ?? "Company"} — Souqly` }],
  }),
  notFoundComponent: () => <div className="p-10 text-center">Company not found</div>,
  errorComponent: () => <div className="p-10 text-center">Something went wrong</div>,
  component: CompanyProfile,
});

function CompanyProfile() {
  const { company } = Route.useLoaderData();
  const { locale, t } = useI18n();
  const name = locale === "ar" ? company.name_ar : company.name_en;
  const industry = locale === "ar" ? company.industry_ar : company.industry_en;
  const country = locale === "ar" ? company.country_ar : company.country_en;
  const companyListings = sampleListings.filter((l) =>
    (locale === "ar" ? l.company_ar : l.company_en) === name
  );

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="hero-gradient text-primary-foreground">
        <div className="container-souqly py-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="h-24 w-24 rounded-lg bg-primary-foreground/15 grid place-items-center text-4xl font-bold">
            {company.initial}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-bold">{name}</h1>
              {company.verified && (
                <span className="inline-flex items-center gap-1 bg-primary-foreground/20 text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                  <BadgeCheck className="h-3.5 w-3.5" />{t("verified_company")}
                </span>
              )}
            </div>
            <p className="opacity-90 mt-1">{industry}</p>
            <div className="flex items-center gap-4 mt-3 text-sm opacity-90">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{country}</span>
              <Badge variant="secondary">{company.listings} {t("listings_count")}</Badge>
            </div>
          </div>
          <Button variant="secondary" className="gap-2"><Mail className="h-4 w-4" />{t("contact_company")}</Button>
        </div>
      </section>
      <section className="container-souqly py-8 flex-1 grid lg:grid-cols-3 gap-6">
        <aside className="lg:col-span-1 space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-card">
            <h2 className="font-semibold mb-2">{t("about")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {locale === "ar"
                ? `${name} هي إحدى الشركات الرائدة في قطاع ${industry} داخل ${country}، تقدم حلولاً متكاملة للأسواق العربية وتتعاون مع شبكة واسعة من المسوقين المعتمدين.`
                : `${name} is a leading ${industry.toLowerCase()} company based in ${country}, serving B2B clients across the MENA region and partnering with a wide network of certified sales agents.`}
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground"><Globe className="h-4 w-4" /> www.{company.id}.example.com</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /> contact@{company.id}.example.com</div>
            </div>
          </div>
          <Button asChild variant="outline" className="w-full"><Link to="/companies">← {t("nav_companies")}</Link></Button>
        </aside>
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">{t("portfolio")}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {companyListings.length > 0
              ? companyListings.map((l) => <ListingCard key={l.id} l={l} />)
              : sampleListings.slice(0, 4).map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
