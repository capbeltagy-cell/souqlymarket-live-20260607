import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/i18n/I18nProvider";
import { listCategories } from "@/lib/phase3.functions";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "الأقسام — Souqly" },
      { name: "description", content: "تصفح فئات الأعمال على سوقلي" },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { locale } = useI18n();
  const [cats, setCats] = useState<{ slug: string; name_ar: string; name_en: string }[]>([]);
  useEffect(() => {
    listCategories().then((r) => setCats(r.categories));
  }, []);
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1">
        <h1 className="text-3xl font-bold mb-6">
          {locale === "ar" ? "أقسام الأعمال" : "Business Categories"}
        </h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {cats.map((c) => (
            <Link
              key={c.slug}
              to="/categories/$slug"
              params={{ slug: c.slug }}
              className="rounded-lg border border-border bg-card p-6 hover:bg-muted transition shadow-card text-center"
            >
              <div className="text-lg font-semibold">{locale === "ar" ? c.name_ar : c.name_en}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {locale === "ar" ? c.name_en : c.name_ar}
              </div>
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
