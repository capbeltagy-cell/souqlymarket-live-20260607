import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { BUSINESS_MODULES } from "@/features/business-modules/catalog";

export const Route = createFileRoute("/business-solutions")({
  head: () => ({
    meta: [
      { title: "حلول الشركات — سوقلي" },
      {
        name: "description",
        content: "أدوات سوقلي لإدارة العملاء والمخزون والفواتير والتسويق والتحليلات من مكان واحد.",
      },
      { property: "og:title", content: "حلول الشركات — سوقلي" },
      { property: "og:description", content: "مساحة عمل متكاملة لتنمية وإدارة أعمالك على سوقلي." },
    ],
  }),
  component: BusinessSolutionsPage,
});

function BusinessSolutionsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-card">
          <div className="container-souqly py-10 sm:py-14">
            <Badge variant="outline" className="mb-4">
              مساحة عمل الشركات
            </Badge>
            <div className="max-w-3xl">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                أدوات أعمال متاحة لإدارة شركتك من مكان واحد
              </h1>
              <p className="mt-3 text-base leading-8 text-muted-foreground sm:text-lg">
                افتح أدوات شركتك العاملة لإدارة العملاء والمخزون والفواتير والتسويق والتقارير.
              </p>
            </div>
          </div>
        </section>

        <section className="container-souqly py-8 sm:py-12">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BUSINESS_MODULES.map((module) => {
              const Icon = module.icon;
              const card = (
                <div className="group h-full rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elev">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <h2 className="mt-5 text-lg font-semibold">{module.name}</h2>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">
                    {module.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    فتح الوحدة{" "}
                    <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
                  </span>
                </div>
              );
              return (
                <Link
                  key={module.key}
                  to={module.href}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
                >
                  {card}
                </Link>
              );
            })}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
