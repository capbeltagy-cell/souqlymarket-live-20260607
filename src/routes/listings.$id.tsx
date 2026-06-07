import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, FileText, Heart, Loader2, MapPin, Share2, TrendingUp } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { convertReferral } from "@/lib/referrals.functions";

export const Route = createFileRoute("/listings/$id")({
  head: () => ({ meta: [{ title: "Listing — Souqly" }] }),
  notFoundComponent: () => <NotFoundView />,
  errorComponent: () => (
    <div className="p-10 text-center"><p>Something went wrong.</p></div>
  ),
  component: ListingDetail,
});

type Listing = {
  id: string; type: string;
  title_ar: string; title_en: string;
  description_ar: string | null; description_en: string | null;
  images: string[] | null; video_url: string | null; pdf_url: string | null;
  price: number | null; currency: string | null;
  country: string | null; city: string | null;
  commission_percentage: number | null;
  company_id: string;
  companies: {
    id: string; name_ar: string; name_en: string;
    is_verified: boolean; phone: string | null; email: string | null;
  } | null;
};

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
  const { id } = Route.useParams();
  const { t, locale, dir } = useI18n();
  const Arrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const [l, setL] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("listings")
      .select("id, type, title_ar, title_en, description_ar, description_en, images, video_url, pdf_url, price, currency, country, city, commission_percentage, company_id, companies(id, name_ar, name_en, is_verified, phone, email)")
      .eq("id", id).maybeSingle()
      .then(({ data }) => { setL(data as unknown as Listing); setLoading(false); });
  }, [id]);

  if (loading) return <div className="min-h-screen flex flex-col"><SiteHeader /><div className="p-10 text-center text-muted-foreground flex-1">{t("loading")}</div><SiteFooter /></div>;
  if (!l) return <NotFoundView />;

  const title = (locale === "ar" ? l.title_ar : l.title_en) ?? "";
  const desc = (locale === "ar" ? l.description_ar : l.description_en) ?? "";
  const company = l.companies;
  const companyName = company ? (locale === "ar" ? company.name_ar : company.name_en) : "";
  const cover = l.images?.[0];
  const whatsappNum = company?.phone?.replace(/[^0-9]/g, "");

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
              {cover ? (
                <img src={cover} alt={title} className="w-full aspect-video object-cover" />
              ) : (
                <div className="w-full aspect-video bg-muted grid place-items-center text-muted-foreground">No image</div>
              )}
            </div>
            {l.images && l.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {l.images.slice(1).map((u) => <img key={u} src={u} alt="" className="h-20 w-20 object-cover rounded border border-border flex-shrink-0" />)}
              </div>
            )}
            {l.video_url && (
              <video controls src={l.video_url} className="w-full rounded-xl border border-border" />
            )}
            <div>
              <Badge className="mb-2">{t(`cat_${l.type}` as never)}</Badge>
              <h1 className="text-3xl font-bold mb-2">{title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                {company && (
                  <Link to="/companies/$id" params={{ id: company.id }} className="flex items-center gap-1 hover:text-primary">
                    {company.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}{companyName}
                  </Link>
                )}
                {(l.city || l.country) && (
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{[l.city, l.country].filter(Boolean).join(", ")}</span>
                )}
              </div>
            </div>
            <div className="prose max-w-none text-foreground">
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{desc || "—"}</p>
            </div>
            {l.pdf_url && (
              <a href={l.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                <FileText className="h-4 w-4" />Brochure (PDF)
              </a>
            )}
          </div>
          <aside className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 shadow-card sticky top-20">
              {l.price && l.price > 0 && (
                <div className="text-3xl font-bold text-primary mb-1">{l.currency ?? "USD"} {l.price.toLocaleString()}</div>
              )}
              <div className="flex items-center gap-1 text-sm text-success font-medium mb-4">
                <TrendingUp className="h-4 w-4" />{t("commission")} {l.commission_percentage ?? 0}%
              </div>
              {whatsappNum ? (
                <Button asChild className="w-full bg-success hover:bg-success/90" size="lg">
                  <a href={`https://wa.me/${whatsappNum}?text=${encodeURIComponent(title)}`} target="_blank" rel="noreferrer">
                    {t("contact_whatsapp")}
                  </a>
                </Button>
              ) : company?.email ? (
                <Button asChild className="w-full bg-primary hover:bg-primary-hover" size="lg">
                  <a href={`mailto:${company.email}?subject=${encodeURIComponent(title)}`}>{t("contact_company")}</a>
                </Button>
              ) : null}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Button variant="outline" size="sm" className="gap-1"><Heart className="h-4 w-4" />{t("save_favorite")}</Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => { navigator.clipboard.writeText(window.location.href); }}><Share2 className="h-4 w-4" />Share</Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
