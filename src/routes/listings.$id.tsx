import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BadgeCheck, Heart, MapPin, Share2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/i18n/I18nProvider";
import { listingCompany, listingCountry, listingTitle, sampleListings } from "@/lib/sampleData";

export const Route = createFileRoute("/listings/$id")({
  loader: ({ params }) => {
    const l = sampleListings.find((x) => x.id === params.id);
    if (!l) throw notFound();
    return { l };
  },
  notFoundComponent: () => <NotFoundView />,
  errorComponent: ({ reset }) => (
    <div className="p-10 text-center"><p>Something went wrong.</p><Button onClick={reset} className="mt-4">Retry</Button></div>
  ),
  component: ListingDetail,
});

function NotFoundView() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 grid place-items-center text-center p-10">
        <div>
          <h1 className="text-2xl font-bold mb-4">{t("no_results")}</h1>
          <Button asChild><Link to="/marketplace">{t("nav_marketplace")}</Link></Button>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function ListingDetail() {
  const { l } = Route.useLoaderData();
  const { t, locale, dir } = useI18n();
  const Arrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container-souqly py-6">
        <Button asChild variant="ghost" size="sm" className="mb-4 gap-1">
          <Link to="/marketplace"><Arrow className="h-4 w-4" />{t("nav_marketplace")}</Link>
        </Button>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl overflow-hidden border border-border bg-card">
              <img src={l.image} alt={listingTitle(l, locale)} className="w-full aspect-video object-cover" />
            </div>
            <div>
              <Badge className="mb-2">{t(`cat_${l.type}` as never)}</Badge>
              <h1 className="text-3xl font-bold mb-2">{listingTitle(l, locale)}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><BadgeCheck className="h-4 w-4 text-primary" />{listingCompany(l, locale)}</span>
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{listingCountry(l, locale)}</span>
              </div>
            </div>
            <div className="prose max-w-none text-foreground">
              <p className="text-muted-foreground leading-relaxed">
                {locale === "ar"
                  ? "وصف تفصيلي لهذا الإعلان. يتضمن المواصفات الكاملة، شروط البيع، خيارات التوصيل، وكافة المعلومات التي يحتاجها العميل والمسوق لاتخاذ القرار."
                  : "Full detailed description for this listing. Covers specs, sales terms, delivery options, and everything a buyer or agent needs to make a decision."}
              </p>
            </div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 shadow-card sticky top-20">
              {l.price > 0 && <div className="text-3xl font-bold text-primary mb-1">${l.price.toLocaleString()}</div>}
              <div className="flex items-center gap-1 text-sm text-success font-medium mb-4">
                <TrendingUp className="h-4 w-4" />{t("commission")} {l.commission}%
              </div>
              <Button className="w-full bg-primary hover:bg-primary-hover" size="lg">{t("view_details")}</Button>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Button variant="outline" size="sm" className="gap-1"><Heart className="h-4 w-4" />{t("save_favorite")}</Button>
                <Button variant="outline" size="sm" className="gap-1"><Share2 className="h-4 w-4" />Share</Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
