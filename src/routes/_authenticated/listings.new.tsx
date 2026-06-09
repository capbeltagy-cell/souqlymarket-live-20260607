import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera, Loader2, PlusCircle, Sparkles, Upload, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n/I18nProvider";
import { LISTING_TYPES, type ListingType } from "@/lib/marketplace";
import { getMyPlan } from "@/lib/billing.functions";
import { getMyCompanySubscription } from "@/lib/subscription.functions";
import { createListing, checkListingDuplicate } from "@/lib/listings.functions";
import { EGYPT_GOVERNORATES, getCitiesForGovernorate } from "@/lib/egypt.locations";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MapView } from "@/components/MapView";

export const Route = createFileRoute("/_authenticated/listings/new")({
  head: () => ({ meta: [{ title: "New Listing — Souqly" }] }),
  component: NewListing,
});

function NewListing() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fetchPlan = useServerFn(getMyPlan);
  const fetchSub = useServerFn(getMyCompanySubscription);
  const create = useServerFn(createListing);
  const checkDup = useServerFn(checkListingDuplicate);
  const [planInfo, setPlanInfo] = useState<{ plan: string; maxListings: number; currentListings: number; hasCompany: boolean; isPaid: boolean } | null>(null);

  const [type, setType] = useState<ListingType>("product");
  const [title_ar, setTitleAr] = useState("");
  const [title_en, setTitleEn] = useState("");
  const [description_ar, setDescAr] = useState("");
  const [description_en, setDescEn] = useState("");
  const [country] = useState("Egypt");
  const [city, setCity] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [price, setPrice] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [commission, setCommission] = useState("5");
  const [propertySubtype, setPropertySubtype] = useState("");
  const [areaSqm, setAreaSqm] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [purpose, setPurpose] = useState<"sale" | "rent" | "">("");
  const [ownershipType, setOwnershipType] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [imageSources, setImageSources] = useState<("live_capture" | "uploaded")[]>([]);
  const [pdf_url, setPdf] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [forceDup, setForceDup] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [p, sub] = await Promise.all([fetchPlan(), fetchSub()]);
        setPlanInfo({
          plan: sub.isPaid ? "premium_company" : p.plan,
          maxListings: sub.listingLimit,
          currentListings: sub.listingsCount,
          hasCompany: sub.hasCompany,
          isPaid: sub.isPaid,
        });
        if (sub.hasCompany && !sub.isPaid && sub.listingsCount >= sub.listingLimit) {
          navigate({ to: "/subscribe" });
        }
      } catch { /* noop */ }
    })();
  }, [user, fetchPlan, fetchSub, navigate]);

  const atLimit = planInfo && planInfo.maxListings !== -1 && planInfo.currentListings >= planInfo.maxListings;

  const uploadFile = async (file: File, kind: "image" | "video" | "pdf") => {
    if (!user) return null;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("listing-media").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("listing-media").getPublicUrl(path);
      return data.publicUrl;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    } finally { setUploading(false); }
  };

  const onImageUpload = async (file: File, source: "live_capture" | "uploaded" = "uploaded") => {
    const url = await uploadFile(file, "image");
    if (url) {
      setImages((prev) => [...prev, url]);
      setImageSources((prev) => [...prev, source]);
    }
  };
  const onPdfUpload = async (file: File) => {
    const url = await uploadFile(file, "pdf");
    if (url) setPdf(url);
  };
  const removeImage = (i: number) => {
    setImages((prev) => prev.filter((_, j) => j !== i));
    setImageSources((prev) => prev.filter((_, j) => j !== i));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planInfo?.hasCompany) { toast.error(t("need_company_first")); return; }
    if (atLimit) { navigate({ to: "/subscribe" }); return; }

    if (!title_ar.trim() && !title_en.trim()) {
      toast.error(locale === "ar" ? "من فضلك أدخل عنوان الإعلان" : "Please enter a title");
      return;
    }
    if (!governorate) {
      toast.error(locale === "ar" ? "اختر المحافظة" : "Select a governorate");
      return;
    }
    if (!city) {
      toast.error(locale === "ar" ? "اختر المدينة" : "Select a city");
      return;
    }

    setSubmitting(true);
    try {
      const res = await create({
        data: {
          type,
          title_ar: title_ar || title_en,
          title_en: title_en || title_ar,
          description_ar: description_ar || null,
          description_en: description_en || null,
          country: country || null,
          city,
          governorate,
          location: [city, governorate, country].filter(Boolean).join(" · ") || null,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          category: null,
          price: price ? Number(price) : null,
          currency: "EGP",
          commission_percentage: Number(commission || 5),
          images,
          video_url: null,
          pdf_url: pdf_url || null,
          property_subtype: propertySubtype || null,
          area_sqm: areaSqm ? Number(areaSqm) : null,
          bedrooms: bedrooms ? Number(bedrooms) : null,
          bathrooms: bathrooms ? Number(bathrooms) : null,
          purpose: purpose || null,
          ownership_type: ownershipType || null,
          address_line: addressLine || null,
        } as never,
      });
      toast.success(locale === "ar" ? "تم نشر الإعلان بنجاح" : "Listing published successfully");
      try {
        await navigate({ to: "/listings/$id", params: { id: res.id } });
      } catch {
        await navigate({ to: "/marketplace" });
      }
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("LISTING_LIMIT_REACHED")) { navigate({ to: "/subscribe" }); }
      else { toast.error(msg || (locale === "ar" ? "تعذّر نشر الإعلان" : "Could not publish listing")); }
    }
    finally { setSubmitting(false); }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error(locale === "ar" ? "الموقع غير مدعوم في المتصفح" : "Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        toast.success(locale === "ar" ? "تم تحديد موقعك" : "Location set");
      },
      () => toast.error(locale === "ar" ? "تعذّر الحصول على الموقع" : "Could not get location"),
    );
  };


  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
            <div className="flex items-center gap-2">
              <PlusCircle className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">{t("new_listing_title")}</h1>
            </div>
            {planInfo && (
              <div className="text-xs text-muted-foreground">
                {t("current_plan")}: <span className="font-semibold capitalize">{planInfo.plan.replace("_", " ")}</span>
                {" · "}{planInfo.currentListings}/{planInfo.maxListings === -1 ? "∞" : planInfo.maxListings}
              </div>
            )}
          </div>

          {planInfo && !planInfo.hasCompany && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 mb-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm">
                <div className="font-semibold">{t("need_company_first")}</div>
                <div className="text-muted-foreground">{t("create_company_to_list")}</div>
              </div>
              <Button asChild className="bg-primary hover:bg-primary-hover">
                <Link to="/company">{t("create_company")}</Link>
              </Button>
            </div>
          )}

          {atLimit && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 mb-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm">
                <div className="font-semibold">{t("plan_limits_reached")}</div>
                <div className="text-muted-foreground">{t("upgrade_to_unlock")} — 499 EGP / شهر</div>
              </div>
              <Button asChild className="bg-primary hover:bg-primary-hover gap-2">
                <Link to="/subscribe"><Sparkles className="h-4 w-4" />{t("upgrade")}</Link>
              </Button>
            </div>
          )}

          <form onSubmit={onSubmit} className="rounded-lg border border-border bg-card p-6 shadow-card space-y-5">
            <div className="grid sm:grid-cols-1 gap-4">
              <Field label={t("field_type")}>
                <Select value={type} onValueChange={(v) => setType(v as ListingType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LISTING_TYPES.map((tp) => (
                      <SelectItem key={tp} value={tp}>{t(`cat_${tp}` as never)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {(type === "real_estate" || type === "land") && (
              <div className="grid sm:grid-cols-4 gap-4">
                <Field label={locale === "ar" ? "النوع الفرعي" : "Subtype"}>
                  <select value={propertySubtype} onChange={(e) => setPropertySubtype(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">—</option>
                    {(type === "real_estate"
                      ? [["apartment","شقة","Apartment"],["villa","فيلا","Villa"],["shop","محل","Shop"],["office","مكتب","Office"],["warehouse","مخزن","Warehouse"]]
                      : [["agricultural","زراعية","Agricultural"],["industrial","صناعية","Industrial"],["investment","استثمارية","Investment"],["building","بناء","Building"]]
                    ).map(([v, ar, en]) => <option key={v} value={v}>{locale === "ar" ? ar : en}</option>)}
                  </select>
                </Field>
                <Field label={locale === "ar" ? "المساحة (م²)" : "Area (m²)"}>
                  <Input type="number" min="0" value={areaSqm} onChange={(e) => setAreaSqm(e.target.value)} />
                </Field>
                {type === "real_estate" && (
                  <>
                    <Field label={locale === "ar" ? "غرف النوم" : "Bedrooms"}>
                      <Input type="number" min="0" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
                    </Field>
                    <Field label={locale === "ar" ? "الحمامات" : "Bathrooms"}>
                      <Input type="number" min="0" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
                    </Field>
                  </>
                )}
              </div>
            )}
            {(type === "real_estate" || type === "land") && (
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label={locale === "ar" ? "الغرض" : "Purpose"}>
                  <select value={purpose} onChange={(e) => setPurpose(e.target.value as "sale" | "rent" | "")}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">—</option>
                    <option value="sale">{locale === "ar" ? "للبيع" : "For Sale"}</option>
                    <option value="rent">{locale === "ar" ? "للإيجار" : "For Rent"}</option>
                  </select>
                </Field>
                <Field label={locale === "ar" ? "نوع الملكية" : "Ownership type"}>
                  <select value={ownershipType} onChange={(e) => setOwnershipType(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">—</option>
                    <option value="freehold">{locale === "ar" ? "تمليك" : "Freehold"}</option>
                    <option value="leasehold">{locale === "ar" ? "إيجار طويل" : "Leasehold"}</option>
                    <option value="shared">{locale === "ar" ? "مشترك" : "Shared"}</option>
                  </select>
                </Field>
                <Field label={locale === "ar" ? "العنوان التفصيلي (يظهر للمالك فقط)" : "Detailed address (owner only)"}>
                  <Input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} maxLength={300} />
                </Field>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={`${t("field_title")} (AR)`} required>
                <Input dir="rtl" required maxLength={200} value={title_ar} onChange={(e) => setTitleAr(e.target.value)} />
              </Field>
              <Field label={`${t("field_title")} (EN)`} required>
                <Input required maxLength={200} value={title_en} onChange={(e) => setTitleEn(e.target.value)} />
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={`${t("field_description")} (AR)`}>
                <Textarea dir="rtl" rows={4} value={description_ar} onChange={(e) => setDescAr(e.target.value)} />
              </Field>
              <Field label={`${t("field_description")} (EN)`}>
                <Textarea rows={4} value={description_en} onChange={(e) => setDescEn(e.target.value)} />
              </Field>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label={t("field_country")} required>
                <Input value={country} readOnly />
              </Field>
              <Field label={t("field_governorate")} required>
                <select
                  required
                  value={governorate}
                  onChange={(e) => {
                    setGovernorate(e.target.value);
                    setCity("");
                  }}

                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">{t("field_governorate")}</option>
                  {EGYPT_GOVERNORATES.map((gov) => (
                    <option key={gov.value} value={gov.value}>
                      {locale === "ar" ? gov.label_ar : gov.label_en}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("field_city")} required>
                <select
                  required
                  disabled={!governorate}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">{t("field_city")}</option>
                  {getCitiesForGovernorate(governorate).map((ct) => (
                    <option key={ct.value} value={ct.value}>
                      {locale === "ar" ? ct.label_ar : ct.label_en}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={locale === "ar" ? "السعر (جنيه)" : "Price (EGP)"}>
                <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder={locale === "ar" ? "السعر بالجنيه المصري" : "Price in EGP"} />
              </Field>
              <Field label={t("field_commission")}>
                <Input type="number" min={0} max={100} step="0.1" value={commission} onChange={(e) => setCommission(e.target.value)} />
              </Field>
            </div>

            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-sm font-semibold">
                  {locale === "ar" ? "الموقع على الخريطة (اختياري)" : "Map location (optional)"}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>
                  {locale === "ar" ? "استخدم موقعي الحالي" : "Use my current location"}
                </Button>
              </div>
              {!latitude || !longitude ? (
                <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
                  {locale === "ar"
                    ? "إضافة الموقع على الخريطة تزيد ثقة الإعلان وتساعد العملاء على الوصول إليك"
                    : "Adding map location boosts trust and helps customers reach you"}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  {locale === "ar" ? "الإحداثيات" : "Coordinates"}: {latitude}, {longitude}
                </div>
              )}
              <MapView
                markers={latitude && longitude ? [{ id: "preview", lat: Number(latitude), lng: Number(longitude), type, title: locale === "ar" ? title_ar : title_en || title_ar, description: [city, governorate, country].filter(Boolean).join(" · ") }] : []}
                center={latitude && longitude ? [Number(latitude), Number(longitude)] : undefined}
                zoom={latitude && longitude ? 12 : 6}
                onMapClick={(coords) => {
                  setLatitude(coords.lat.toFixed(6));
                  setLongitude(coords.lng.toFixed(6));
                }}
                className="mb-4"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("field_images")}</Label>
              <div className="flex flex-wrap gap-2">
                {images.map((url, i) => (
                  <div key={url} className="relative">
                    <img src={url} alt="" className="h-20 w-20 object-cover rounded border border-border" />
                    <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))}
                      className="absolute -top-1 -end-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground grid place-items-center"><X className="h-3 w-3" /></button>
                  </div>
                ))}
                <label className="h-20 w-20 rounded border-2 border-dashed border-input grid place-items-center cursor-pointer hover:bg-muted">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onImageUpload(e.target.files[0])} />
                </label>
              </div>
            </div>

            <div className="grid sm:grid-cols-1 gap-4">
              <Field label={t("field_pdf") }>
                <UploadButton url={pdf_url} accept="application/pdf" onChange={onPdfUpload} onClear={() => setPdf("")} />
              </Field>
            </div>

            <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-card/95 backdrop-blur border-t border-border sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:pt-2">
              <Button type="submit" disabled={submitting || uploading || !planInfo?.hasCompany} className="w-full sm:w-auto h-12 sm:h-10 bg-primary hover:bg-primary-hover">
                {submitting && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {locale === "ar" ? "نشر الإعلان" : t("submit_listing")}
              </Button>
            </div>
          </form>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return <div className="space-y-1.5"><Label>{label}{required && " *"}</Label>{children}</div>;
}

function UploadButton({ url, accept, onChange, onClear }: { url: string; accept: string; onChange: (f: File) => void; onClear: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="flex-1 inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-input bg-background cursor-pointer hover:bg-muted">
        <Upload className="h-4 w-4" />
        <span className="truncate">{url ? url.split("/").pop() : "Upload"}</span>
        <input type="file" accept={accept} className="hidden" onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])} />
      </label>
      {url && <Button type="button" size="sm" variant="ghost" onClick={onClear}><X className="h-4 w-4" /></Button>}
    </div>
  );
}
