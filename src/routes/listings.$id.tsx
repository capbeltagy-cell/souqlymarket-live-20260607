import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, Copy, FileText, Heart, Loader2, MapPin, Sparkles, Star, TrendingUp } from "lucide-react";
import { ShareMenu } from "@/components/ShareMenu";
import { listingCaption } from "@/lib/share-captions";
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
import { ListingImageGallery } from "@/components/ListingImageGallery";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { rankListings } from "@/lib/ranking";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { convertReferral, createReferral } from "@/lib/referrals.functions";
import { getListingContact } from "@/lib/listings.functions";
import { featureMyListing, FEATURE_PRICING_EGP } from "@/lib/phase2.functions";
import { startConversationForListing } from "@/lib/messages.functions";
import { createOrderFromListing } from "@/lib/orders.functions";
import { addToCart } from "@/lib/cart";
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
  commission_type: string | null;
  commission_fixed_amount: number | null;
  marketer_promotion_enabled: boolean | null;
  promotion_status: string | null;
  // phone/whatsapp intentionally NOT selected in public query — loaded via server fn.
  source_name: string | null; source_url: string | null;
  featured: boolean | null; featured_until: string | null;
  views_count: number | null;
  updated_at: string | null;
  company_id: string;
  companies: {
    id: string; name_ar: string; name_en: string;
    is_verified: boolean; is_premium?: boolean | null;
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
  const { user, roles } = useAuth();
  const isAgent = roles.includes("agent");
  const convert = useServerFn(convertReferral);
  const feature = useServerFn(featureMyListing);
  const makeReferral = useServerFn(createReferral);
  const startConv = useServerFn(startConversationForListing);
  const createOrder = useServerFn(createOrderFromListing);
  const [ordering, setOrdering] = useState(false);
  const navigate = Route.useNavigate();
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
  const [msgLoading, setMsgLoading] = useState(false);
  const [myShareLink, setMyShareLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [contact, setContact] = useState<{ phone: string | null; whatsapp: string | null }>({ phone: null, whatsapp: null });
  const [related, setRelated] = useState<ListingCardData[]>([]);
  const loadContact = useServerFn(getListingContact);

  const onGetShareLink = async () => {
    setGeneratingLink(true);
    try {
      const res = await makeReferral({ data: { listingId: id } });
      const url = `${window.location.origin}/r/${res.code}`;
      setMyShareLink(url);
      try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
      toast.success(ar ? "تم توليد رابطك ونسخه — شاركه واكسب عمولتك عند إتمام الصفقة." : "Your link is ready & copied. Share it to earn on every closed deal.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGeneratingLink(false);
    }
  };

  const onMessageSeller = async () => {
    setMsgLoading(true);
    try {
      const { id: convId } = await startConv({ data: { listing_id: id } });
      navigate({ to: "/messages", search: { c: convId } });
    } catch (e) { toast.error((e as Error).message); }
    finally { setMsgLoading(false); }
  };

  const onOrder = async () => {
    setOrdering(true);
    try {
      let referral_code: string | undefined;
      try { referral_code = localStorage.getItem("souqly.ref") || undefined; } catch { /* noop */ }
      const { id: orderId } = await createOrder({ data: { listing_id: id, quantity: 1, referral_code } });

      toast.success(ar ? "تم إنشاء الطلب — انتقل لصفحة الطلب لإكمال البيانات" : "Order created");
      navigate({ to: "/orders/$id", params: { id: orderId } });
    } catch (e) { toast.error((e as Error).message); }
    finally { setOrdering(false); }
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("listings")
        .select("id, type, title_ar, title_en, description_ar, description_en, images, image_sources, video_url, pdf_url, price, currency, country, governorate, city, latitude, longitude, commission_percentage, commission_type, commission_fixed_amount, marketer_promotion_enabled, promotion_status, source_name, source_url, featured, featured_until, views_count, updated_at, company_id, companies(id, name_ar, name_en, is_verified, is_premium)")
        .eq("id", id).maybeSingle();
      setL(data as unknown as Listing);
      supabase.rpc("increment_listing_view", { _id: id });
      // Contact is served by a secured server fn (mask on promoted listings).
      loadContact({ data: { id } }).then((c) => setContact({ phone: c.phone, whatsapp: c.whatsapp })).catch(() => {});
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
  }, [id, user, loadContact]);

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
  const isPromoted = !!l.marketer_promotion_enabled && (l.promotion_status ?? "active") === "active";
  // All buyer↔company contact goes through Souqly. Only the listing owner sees direct contact.
  const showContact = isOwner;
  const contactPhone = showContact ? ((contact.phone || contact.whatsapp) ?? "").replace(/[^0-9]/g, "") : "";
  const whatsappNum = showContact ? ((contact.whatsapp || contact.phone) ?? "").replace(/[^0-9]/g, "") : "";
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
            <ListingImageGallery images={l.images ?? []} alt={title} />
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
                {isOwner && (
                  <Button asChild size="sm" variant="outline" className="ml-2 h-7 text-xs">
                    <Link to="/listings/$id/edit" params={{ id }}>{ar ? "تعديل الإعلان" : "Edit listing"}</Link>
                  </Button>
                )}
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
              {l.source_name && (
                <div className="mt-2 rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                  <span>{ar ? "المصدر" : "Source"}: <span className="font-medium text-foreground">{l.source_name}</span></span>
                  {l.source_url && (
                    <a href={l.source_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {ar ? "عرض الإعلان الأصلي" : "View original listing"}
                    </a>
                  )}
                </div>
              )}
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
              {contactPhone ? (
                <div className="space-y-2">
                  <Button asChild className="w-full bg-success hover:bg-success/90" size="lg" onClick={() => supabase.rpc("increment_listing_click", { _id: id })}>
                    <a href={`https://wa.me/${whatsappNum || contactPhone}?text=${encodeURIComponent(title)}`} target="_blank" rel="noreferrer">
                      {t("contact_whatsapp")}
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="w-full" size="lg">
                    <a href={`tel:+${contactPhone}`}>{t("call_now")}</a>
                  </Button>
                </div>
              ) : !isOwner ? (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                  {ar
                    ? "لحماية معاملتك، يتم إتمام الطلب والتواصل عبر سوقلي فقط. أضف المنتج إلى السلة أو أرسل استفسارًا من هنا."
                    : "For your protection, orders and contact happen through Souqly. Add to cart or send an inquiry from here."}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2 mt-3">
                <Button variant="outline" size="sm" className="gap-1" onClick={toggleFav}>
                  <Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : ""}`} />{fav ? t("saved") : t("save_favorite")}
                </Button>
                <ShareMenu
                  url={`/listings/${id}`}
                  title={title}
                  caption={listingCaption({ locale, type: l.type, titleAr: l.title_ar, titleEn: l.title_en, price: l.price, currency: l.currency, governorate: l.governorate, city: l.city, sourceName: l.source_name })}
                  variant="button"
                  className="w-full"
                />
              </div>
              {!isOwner && user && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button className="gap-2 bg-primary hover:bg-primary-hover" onClick={onOrder} disabled={ordering}>
                    {ordering ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {ar ? "اطلب الآن" : "Order now"}
                  </Button>
                  <Button className="gap-2" variant="secondary" onClick={onMessageSeller} disabled={msgLoading}>
                    <Sparkles className="h-4 w-4" />{ar ? "راسل البائع" : "Message"}
                  </Button>
                  <Button
                    className="gap-2 col-span-2"
                    variant="outline"
                    onClick={() => {
                      addToCart({
                        listing_id: id,
                        company_id: l?.company_id ?? null,
                        title: (ar ? l?.title_ar : l?.title_en) ?? l?.title_ar ?? l?.title_en ?? "",
                        image: l?.images?.[0] ?? null,
                        price: Number(l?.price ?? 0),
                        currency: l?.currency ?? "EGP",
                      });
                      toast.success(ar ? "تمت الإضافة إلى السلة" : "Added to cart");
                    }}
                  >
                    {ar ? "أضف إلى السلة" : "Add to cart"}
                  </Button>
                </div>
              )}
            </div>
            {!isOwner && <LeadForm listingId={id} />}
            {!isOwner && user && isAgent && (
              <div className="rounded-xl border border-accent/40 bg-gradient-to-br from-accent/10 via-card to-card p-5 shadow-card space-y-3">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    {ar ? `اربح ${l.commission_percentage ?? 0}% عمولة` : `Earn ${l.commission_percentage ?? 0}% commission`}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {ar
                      ? "ولّد رابطك الخاص وشاركه على واتساب وفيسبوك. عند إتمام أي صفقة عبر رابطك، تُسجَّل عمولتك تلقائيًا في محفظتك."
                      : "Generate your unique link and share it on WhatsApp or Facebook. When a deal closes through your link, your commission is auto-credited to your wallet."}
                  </p>
                </div>
                {myShareLink ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input readOnly value={myShareLink} className="text-xs" />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={async () => {
                          try { await navigator.clipboard.writeText(myShareLink); toast.success(ar ? "تم النسخ" : "Copied"); }
                          catch { /* ignore */ }
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <ShareMenu
                      url={myShareLink}
                      title={title}
                      earning
                      caption={listingCaption({ locale, type: l.type, titleAr: l.title_ar, titleEn: l.title_en, price: l.price, currency: l.currency, governorate: l.governorate, city: l.city, sourceName: l.source_name })}
                      triggerLabel={ar ? "شارك رابطك واربح" : "Share your link & earn"}
                      className="w-full"
                    />
                    <ol className="text-[11px] text-muted-foreground list-decimal ps-4 space-y-0.5 pt-1">
                      <li>{ar ? "انسخ رابطك" : "Copy your link"}</li>
                      <li>{ar ? "انشره على واتساب أو فيسبوك أو تيك توك" : "Share it on WhatsApp, Facebook, or TikTok"}</li>
                      <li>{ar ? "العميل يطلب من خلال الرابط" : "Customer orders through your link"}</li>
                      <li>{ar ? "العمولة تظهر بعد التحويل المؤهل" : "Commission appears after qualified conversion"}</li>
                    </ol>
                  </div>
                ) : (
                  <Button
                    type="button"
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={onGetShareLink}
                    disabled={generatingLink}
                  >
                    {generatingLink && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                    {ar ? "احصل على رابطي واربح" : "Get my link & earn"}
                  </Button>
                )}
                <p className="text-[10px] text-muted-foreground text-center">
                  {ar ? "تُحسب العمولة على قيمة الصفقة النهائية بعد تأكيد الشركة." : "Commission is calculated on final deal value after seller confirmation."}
                </p>
              </div>
            )}
            {!isOwner && user && !isAgent && (
              <div className="rounded-xl border border-border bg-card p-4 text-center text-xs">
                <p className="text-muted-foreground mb-2">
                  {ar
                    ? `شاركت الإعلان وأتممت الصفقة؟ سجّل كمسوّق واكسب ${l.commission_percentage ?? 0}% عمولة.`
                    : `Refer this listing and earn ${l.commission_percentage ?? 0}% commission — register as a marketer.`}
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/earn">{ar ? "ابدأ الآن" : "Start earning"}</Link>
                </Button>
              </div>
            )}
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
