import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/i18n/I18nProvider";
import { advancedSearchCompanies } from "@/lib/phase3.functions";

export const Route = createFileRoute("/categories/$slug")({
  notFoundComponent: () => <div className="p-10 text-center">Not found</div>,
  errorComponent: () => <div className="p-10 text-center">Error</div>,
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { locale } = useI18n();
  const [companies, setCompanies] = useState<any[]>([]);
  useEffect(() => {
    advancedSearchCompanies({ data: { category_slug: slug } }).then((r) =>
      setCompanies(r.companies),
    );
  }, [slug]);
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1">
        <h1 className="text-3xl font-bold mb-2">{slug}</h1>
        <p className="text-muted-foreground mb-6">
          {locale === "ar" ? "الشركات في هذا القسم" : "Companies in this category"}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-12">
              {locale === "ar" ? "لا توجد شركات بعد" : "No companies yet"}
            </div>
          ) : (
            companies.map((c) => (
              <Link
                key={c.id}
                to="/companies/$id"
                params={{ id: c.id }}
                className="rounded-lg border border-border bg-card p-5 hover:bg-muted transition shadow-card"
              >
                <div className="font-semibold">{locale === "ar" ? c.name_ar : c.name_en}</div>
                <div className="text-sm text-muted-foreground">{c.city ?? c.country ?? ""}</div>
                {c.is_verified && (
                  <span className="inline-block mt-2 bg-primary/10 text-primary text-xs rounded px-2 py-0.5">
                    {locale === "ar" ? "موثقة" : "Verified"}
                  </span>
                )}
              </Link>
            ))
          )}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
