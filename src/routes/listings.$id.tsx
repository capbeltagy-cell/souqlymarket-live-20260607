import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, FileText, Heart, Loader2, MapPin, Share2, Sparkles, Star, TrendingUp } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LeadForm } from "@/components/LeadForm";
import { MapView } from "@/components/MapView";
import { TrustBadge } from "@/components/TrustBadges";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { convertReferral } from "@/lib/referrals.functions";
import { featureMyListing, FEATURE_PRICING_EGP } from "@/lib/phase2.functions";
import { translateEgyptCity, translateEgyptGovernorate } from "@/lib/egypt.locations";
import { formatPrice } from "@/lib/currency";


export const Route = createFileRoute("/listings/$id")({
  loader: async ({ params }) => {
    const { getListingMeta } = await import("@/lib/seo.functions");
    return { meta: await getListingMeta({ data: { id: params.id } }) };
  },
  head: ({ loaderData, params }) => {
    const m = loaderData?.meta;
    const title = m ? `${m.title_en ?? m.title_ar ?? "Listing"} — Souqly` : "Listing — Souqly";
    const desc = (m?.description_en ?? m?.description_ar ?? "Professional B2B listing on Souqly.").slice(0, 160);
    const img = m?.images?.[0];
    const url = `/listings/${params.id}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
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
  images: string[] | null; image_sources: string[] | null; video_url: string | null; pdf_url: string | null;
  price: number | null; currency: string | null;
  country: string | null; city: string | null; governorate: string | null;
  latitude: number | null; longitude: number | null;
  commission_percentage: number | null;
  phone: string | null; whatsapp: string | null;
  featured: boolean | null; featured_until: string | null;
  views_count: number | null;
  updated_at: string | null;
  company_id: string;
  companies: {
    id: string; name_ar: string; name_en: string;
    is_verified: boolean; is_premium?: boolean | null; phone: string | null; email: string | null;
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
  const ar = locale === "ar";
  const { user } = useAuth();
  const convert = useServerFn(convertReferral);
  const feature = useServerFn(featureMyListing);
  const Arrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const [l, setL] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [referrals, setReferrals] = useState<{ id: string; code: string; clicks: number; conversions: number }[]>([]);
  const [selectedRef, setSelectedRef] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [featuring, setFeaturing] = useState<7 | 30 | null>(null);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("listings")
        .select("id, type, title_ar, title_en, description_ar, description_en, images, image_sources, video_url, pdf_url, price, currency, country, governorate, city, latitude, longitude, commission_percentage, phone, whatsapp, featured, featured_until, views_count, updated_at, company_id, companies(id, name_ar, name_en, is_verified, is_premium, phone, email)")
        .eq("id", id).maybeSingle();
      setL(data as unknown as Listing);
      // Track view (fire and forget)
      supabase.rpc("increment_listing_view", { _id: id });
      if (data && user) {
        const { data: owned } = await supabase.from("companies").select("id").eq("id", data.company_id).eq("owner_id", user.id).maybeSingle();
        if (owned) {
          setIsOwner(true);
          const { data: refs } = await supabase.from("referrals").select("id, code, clicks, conversions").eq("listing_id", id);
          setReferrals(refs ?? []);
        }
        const { data: f } = await supabase.from("favorites").select("id").eq("user_id", user.id).eq("listing_id", id).maybeSingle();
        setFav(!!f);
      }
      setLoading(false);
    })();
  }, [id, user]);

  const onFeature = async (days: 7 | 30) => {
    setFeaturing(days);
    try {
      const res = await feature({ data: { listingId: id, days } });
      toast.success(ar ? `تم تثبيت الإعلان حتى ${new Date(res.featured_until).toLocaleDateString()}` : `Featured until ${new Date(res.featured_until).toLocaleDateString()}`);
      setL((cur) => cur ? { ...cur, featured: true, featured_until: res.featured_until } : cur);
    } catch (e) { toast.error((e as Error).message); }
    finally { setFeaturing(null); }
  };

  async function toggleFav() {
    if (!user) { toast.error(t("nav_signin")); return; }
    try {
      if (fav) {
        await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", id);
        setFav(false); toast.success(t("unfavorited"));
      } else {
        await supabase.from("favorites").insert({ user_id: user.id, listing_id: id });
        setFav(true); toast.success(t("favorited"));
      }
    } catch (e) { toast.error((e as Error).message); }
  }

  const onConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRef || !amount) return;
    setSubmitting(true);
    try {
      await convert({ data: { referralId: selectedRef, amount: Number(amount), currency: l?.currency ?? "EGP" } });
      toast.success(t("convert_success"));
      setAmount(""); setSelectedRef("");
      const { data: refs } = await supabase.from("referrals").select("id, code, clicks, conversions").eq("listing_id", id);
      setReferrals(refs ?? []);
    } catch (e) { toast.error((e as Error).message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen flex flex-col"><SiteHeader /><div className="p-10 text-center text-muted-foreground flex-1">{t("loading")}</div><SiteFooter /></div>;
  if (!l) return <NotFoundView />;

  const title = (locale === "ar" ? l.title_ar : l.title_en) ?? "";
  const desc = (locale === "ar" ? l.description_ar : l.description_en) ?? "";
  const company = l.companies;
  const companyName = company ? (locale === "ar" ? company.name_ar : company.name_en) : "";
  const cover = l.images?.[0];
  const contactPhone = (l.phone || l.whatsapp || company?.phone || "").replace(/[^0-9]/g, "");
  const whatsappNum = (l.whatsapp || l.phone || company?.phone || "").replace(/[^0-9]/g, "");
  const hasLive = (l.image_sources ?? []).includes("live_capture");
  const hasUploaded = (l.image_sources ?? []).some((s) => s !== "live_capture");

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
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge>{t(`cat_${l.type}` as never)}</Badge>
                {l.featured && (!l.featured_until || new Date(l.featured_until).getTime() > Date.now()) && (
                  <Badge className="bg-accent text-accent-foreground gap-1"><Star className="h-3 w-3" />{ar ? "مميز" : "Featured"}</Badge>
                )}
                {company?.is_verified && <TrustBadge kind="verified_company" />}
                {company?.is_premium && <TrustBadge kind="premium_company" />}
                {isOwner && <TrustBadge kind="owner" />}
                {hasLive && (
                  <Badge className="bg-success/15 text-success border border-success/30">
                    {ar ? "موثق بالتصوير المباشر" : "Verified live photo"}
                  </Badge>
                )}
                {!hasLive && hasUploaded && (
                  <Badge variant="outline">{ar ? "صورة مرفوعة" : "Uploaded photo"}</Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold mb-2">{title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                {company && (
                  <Link to="/companies/$id" params={{ id: company.id }} className="flex items-center gap-1 hover:text-primary">
                    {company.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}{companyName}
                  </Link>
                )}
                {(l.city || l.governorate || l.country) && (
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{
                    [
                      translateEgyptCity(l.city, locale) ?? l.city,
                      translateEgyptGovernorate(l.governorate, locale) ?? l.governorate,
                      l.country,
                    ].filter(Boolean).join(", ")
                  }</span>
                )}
                {l.updated_at && (
                  <span className="text-xs">{t("last_updated")}: {new Date(l.updated_at).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB")}</span>
                )}
              </div>
            </div>
            {l.latitude !== null && l.longitude !== null && (
              <div className="rounded-xl overflow-hidden border border-border bg-card mb-4">
                <MapView
                  markers={[{ id: l.id, lat: l.latitude, lng: l.longitude, type: l.type as any, title, description: [translateEgyptCity(l.city, locale) ?? l.city, translateEgyptGovernorate(l.governorate, locale) ?? l.governorate, l.country].filter(Boolean).join(" · ") }]}
                  center={[l.latitude, l.longitude]}
                  zoom={13}
                />
              </div>
            )}
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
                <div className="text-3xl font-bold text-primary mb-1">{formatPrice(l.price, locale)}</div>
              )}

              <div className="flex items-center gap-1 text-sm text-success font-medium mb-4">
                <TrendingUp className="h-4 w-4" />{t("commission")} {l.commission_percentage ?? 0}%
              </div>
              {whatsappNum ? (
                <div className="space-y-2">
                  <Button asChild className="w-full bg-success hover:bg-success/90" size="lg" onClick={() => supabase.rpc("increment_listing_click", { _id: id })}>
                    <a href={`https://wa.me/${whatsappNum}?text=${encodeURIComponent(title)}`} target="_blank" rel="noreferrer">
                      {t("contact_whatsapp")}
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="w-full" size="lg">
                    <a href={`tel:+${whatsappNum}`}>{t("call_now")}</a>
                  </Button>
                </div>
              ) : company?.email ? (
                <Button asChild className="w-full bg-primary hover:bg-primary-hover" size="lg" onClick={() => supabase.rpc("increment_listing_click", { _id: id })}>
                  <a href={`mailto:${company.email}?subject=${encodeURIComponent(title)}`}>{t("contact_company")}</a>
                </Button>
              ) : null}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Button variant="outline" size="sm" className="gap-1" onClick={toggleFav}>
                  <Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : ""}`} />{fav ? t("saved") : t("save_favorite")}
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => { navigator.clipboard.writeText(window.location.href); }}><Share2 className="h-4 w-4" />Share</Button>
              </div>
            </div>
            {!isOwner && <LeadForm listingId={id} />}
            {isOwner && (
              <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
                <div>
                  <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" />{ar ? "تثبيت الإعلان في الأعلى" : "Pin listing to top"}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ar
                      ? "اظهر إعلانك في صدارة السوق ولفت انتباه المزيد من العملاء."
                      : "Promote your listing to the top of the marketplace for more visibility."}
                  </p>
                  {l.featured && l.featured_until && new Date(l.featured_until).getTime() > Date.now() && (
                    <p className="text-xs text-success mt-1">
                      {ar ? `مميز حتى ${new Date(l.featured_until).toLocaleDateString()}` : `Featured until ${new Date(l.featured_until).toLocaleDateString()}`}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" disabled={!!featuring} onClick={() => onFeature(7)} className="flex-col h-auto py-3">
                    <span className="font-bold">7 {ar ? "أيام" : "days"}</span>
                    <span className="text-xs text-muted-foreground">{FEATURE_PRICING_EGP[7]} EGP</span>
                  </Button>
                  <Button type="button" disabled={!!featuring} onClick={() => onFeature(30)} className="bg-primary hover:bg-primary-hover flex-col h-auto py-3">
                    <span className="font-bold">30 {ar ? "يوم" : "days"}</span>
                    <span className="text-xs">{FEATURE_PRICING_EGP[30]} EGP</span>
                  </Button>
                </div>
                {featuring && <div className="text-xs text-muted-foreground text-center"><Loader2 className="h-3 w-3 animate-spin inline me-1" />{ar ? "جارٍ التثبيت…" : "Pinning…"}</div>}
              </div>
            )}
            {isOwner && referrals.length > 0 && (
              <form onSubmit={onConvert} className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
                <h3 className="font-semibold text-sm">{t("convert_referral")}</h3>
                <div className="space-y-1.5">
                  <Label>{t("your_referral_code")}</Label>
                  <select value={selectedRef} onChange={(e) => setSelectedRef(e.target.value)} required
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">—</option>
                    {referrals.map((r) => <option key={r.id} value={r.id}>{r.code} ({r.clicks} clicks, {r.conversions} conv)</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("referral_amount")}</Label>
                  <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>
                <Button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary-hover">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin me-2" />}{t("convert_referral")}
                </Button>
              </form>
            )}
          </aside>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
