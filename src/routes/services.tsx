import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Factory,
  Megaphone,
  PackageSearch,
  Ship,
  Wrench,
} from "lucide-react";
import { CollectionState } from "@/components/CollectionState";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { Button } from "@/components/ui/button";
import { marketplaceTaxonomy } from "@/config/marketplace-taxonomy";
import { getPublishedServices } from "@/data/marketplace.repository";
import { queryKeys } from "@/data/query-keys";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "خدمات الأعمال | سوقلي" },
      {
        name: "description",
        content:
          "اعثر على شركات اللوجستيات والتصنيع والتسويق والاستشارات والاستيراد والتصدير في سوقلي.",
      },
    ],
    links: [{ rel: "canonical", href: "https://souqlymarket.com/services" }],
  }),
  component: ServicesPage,
});

const serviceCategories = [
  { key: marketplaceTaxonomy.services[0], label: "اللوجستيات والشحن", icon: Ship },
  { key: marketplaceTaxonomy.services[1], label: "التسويق", icon: Megaphone },
  { key: marketplaceTaxonomy.services[2], label: "التصنيع للغير", icon: Factory },
  { key: marketplaceTaxonomy.services[3], label: "الاستشارات", icon: BriefcaseBusiness },
  { key: marketplaceTaxonomy.services[4], label: "الاستيراد والتصدير", icon: PackageSearch },
] as const;

function ServicesPage() {
  const servicesQuery = useQuery({
    queryKey: queryKeys.marketplace.services(48),
    queryFn: () => getPublishedServices(48),
  });
  const services: ListingCardData[] = servicesQuery.data ?? [];

  return (
    <PublicLayout>
      <section className="border-b border-border bg-surface-2/65">
        <div className="container-souqly py-10 md:py-16">
          <div className="max-w-3xl">
            <span className="status-pill">
              <Wrench className="h-3.5 w-3.5" /> خدمات موثوقة للأعمال
            </span>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">خدمات تساعد شركتك على النمو</h1>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              تواصل مع مقدمي خدمات الأعمال، اطلب عرض سعر، وقارن الاختيارات من ملفات شركات حقيقية.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/rfq/new">اطلب عرض سعر</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/companies">تصفح الشركات</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container-souqly py-8 md:py-12">
        <h2 className="text-2xl font-bold md:text-3xl">التخصصات الرئيسية</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {serviceCategories.map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              to="/search-all"
              search={{ q: label } as never}
              className="group rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary/50"
            >
              <Icon className="h-6 w-6 text-primary" />
              <span className="mt-4 flex items-center justify-between gap-2 font-semibold">
                {label}
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-souqly pb-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">أحدث الخدمات</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              تظهر الخدمات المنشورة والمعتمدة فقط.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <CollectionState
            loading={servicesQuery.isPending}
            error={servicesQuery.isError ? "تعذر تحميل الخدمات الآن. حاول مرة أخرى." : null}
            empty={!servicesQuery.isPending && !servicesQuery.isError && services.length === 0}
            emptyTitle="لا توجد خدمات منشورة حاليًا"
            emptyDescription="يمكنك نشر خدمة من حساب الشركة أو إنشاء طلب عرض سعر ليصل إلى الموردين."
            retryLabel="إعادة المحاولة"
            onRetry={() => void servicesQuery.refetch()}
          />
          {!servicesQuery.isPending && !servicesQuery.isError && services.length > 0 && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              {services.map((service) => (
                <ListingCard key={service.id} l={service} />
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
