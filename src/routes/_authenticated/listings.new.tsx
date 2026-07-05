import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, Loader2, PlusCircle, Sparkles, Upload, X } from "lucide-react";
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
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useI18n } from "@/i18n/I18nProvider";
import { LISTING_TYPES, type ListingType } from "@/lib/marketplace";
import { getMyPlan } from "@/lib/billing.functions";
import { getMyCompanySubscription } from "@/lib/subscription.functions";
import { createListing, checkListingDuplicate } from "@/lib/listings.functions";
import { EGYPT_GOVERNORATES, getCitiesForGovernorate } from "@/lib/egypt.locations";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MapView } from "@/components/MapView";
import { ImageUploader, type UploadedImage, toLegacyShape } from "@/components/ImageUploader";

export const Route = createFileRoute("/_authenticated/listings/new")({
  head: () => ({ meta: [{ title: "إعلان جديد — Souqly" }] }),
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

  // Required
  const [type, setType] = useState<ListingType>("product");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [price, setPrice] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);

  // Advanced
  const [title_en, setTitleEn] = useState("");
  const [description_en, setDescEn] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
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
  const [pdf_url, setPdf] = useState("");
  const [pdfUploading, setPdfUploading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [forceDup, setForceDup] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

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
      } catch (e) {
        setPlanError((e as Error).message || "Could not load plan");
      }
    })();
  }, [user, fetchPlan, fetchSub, navigate]);

  const atLimit = planInfo && planInfo.maxListings !== -1 && planInfo.currentListings >= planInfo.maxListings;

  const onPdfUpload = async (file: File) => {
    if (!user) return;
    setPdfUploading(true);
    try {
      const path = `${user.id}/pdf-${Date.now()}.pdf`;
      const { error } = await supabase.storage.from("listing-media").upload(path, file);
      if (error) throw error;
      const { data, error: sErr } = await supabase.storage.from("listing-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !data?.signedUrl) throw sErr ?? new Error("Sign URL failed");
      setPdf(data.signedUrl);
    } catch (e) { toast.error((e as Error).message); }
    finally { setPdfUploading(false); }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error("الموقع غير مدعوم"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        toast.success("تم تحديد موقعك");
      },
      () => toast.error("تعذّر الحصول على الموقع"),
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planInfo?.hasCompany) { toast.error(t("need_company_first")); return; }
    if (atLimit) { navigate({ to: "/subscribe" }); return; }

    if (!title.trim()) { toast.error("أدخل عنوان الإعلان"); return; }
    if (!governorate || !city) { toast.error("اختر المحافظة والمدينة"); return; }
    if (images.length === 0) { toast.error("أضف صورة واحدة على الأقل"); return; }

    setSubmitting(true);
    try {
      if (!forceDup) {
        try {
          const dup = await checkDup({ data: {
            title_ar: title, title_en: title_en || title, governorate,
            phone: phone || whatsapp || null,
            latitude: latitude ? Number(latitude) : null,
            longitude: longitude ? Number(longitude) : null,
          } });
          if (dup.severity === "exact") {
            toast.error("هذا الإعلان مكرر بالفعل"); setSubmitting(false); return;
          }
          if (dup.severity === "similar") {
            setForceDup(true);
            toast.warning("يوجد إعلان مشابه — اضغط نشر مرة أخرى للمتابعة كمراجعة");
            setSubmitting(false); return;
          }
        } catch { /* non-fatal */ }
      }

      const legacy = toLegacyShape(images);
      const res = await create({
        data: {
          type,
          title_ar: title,
          title_en: title_en || title,
          description_ar: description || null,
          description_en: description_en || description || null,
          country: "Egypt",
          city, governorate,
          location: [city, governorate, "Egypt"].filter(Boolean).join(" · "),
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          category: null,
          price: price ? Number(price) : null,
          currency: "EGP",
          commission_percentage: Number(commission || 5),
          images: legacy.images,
          image_sources: legacy.image_sources,
          phone: phone || null,
          whatsapp: whatsapp || null,
          video_url: null,
          pdf_url: pdf_url || null,
          property_subtype: propertySubtype || null,
          area_sqm: areaSqm ? Number(areaSqm) : null,
          bedrooms: bedrooms ? Number(bedrooms) : null,
          bathrooms: bathrooms ? Number(bathrooms) : null,
          purpose: purpose || null,
          ownership_type: ownershipType || null,
          address_line: addressLine || null,
          force: forceDup,
        } as never,
      });
      const pending = (res as { status?: string }).status === "pending_review";
      toast.success(pending ? "تم استلام إعلانك للمراجعة" : "تم نشر الإعلان بنجاح");
      try { await navigate({ to: "/listings/$id", params: { id: res.id } }); }
      catch { await navigate({ to: "/marketplace" }); }
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("LISTING_LIMIT_REACHED")) navigate({ to: "/subscribe" });
      else if (msg.includes("DUPLICATE_EXACT")) toast.error("هذا الإعلان مكرر");
      else toast.error(msg || "تعذّر نشر الإعلان");
    }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
            <div className="flex items-center gap-2">
              <PlusCircle className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">إعلان جديد</h1>
            </div>
            {planInfo && (
              <div className="text-xs text-muted-foreground">
                {planInfo.currentListings}/{planInfo.maxListings === -1 ? "∞" : planInfo.maxListings}
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
              </div>
              <Button asChild className="bg-primary hover:bg-primary-hover gap-2">
                <Link to="/subscribe"><Sparkles className="h-4 w-4" />{t("upgrade")}</Link>
              </Button>
            </div>
          )}

          <form onSubmit={onSubmit} className="rounded-xl border border-border bg-card p-6 shadow-card space-y-5">
            {/* Type */}
            <Field label="نوع الإعلان" required>
              <Select value={type} onValueChange={(v) => setType(v as ListingType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LISTING_TYPES.map((tp) => (
                    <SelectItem key={tp} value={tp}>{t(`cat_${tp}` as never)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Title */}
            <Field label="العنوان" required>
              <Input maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اكتب عنوان واضح ومختصر" />
            </Field>

            {/* Price */}
            <Field label="السعر (جنيه)" required>
              <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="السعر بالجنيه المصري" />
            </Field>

            {/* Description */}
            <Field label="الوصف">
              <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="اكتب تفاصيل مفيدة للمشتري" />
            </Field>

            {/* Location */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="المحافظة" required>
                <select required value={governorate}
                  onChange={(e) => { setGovernorate(e.target.value); setCity(""); }}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">اختر المحافظة</option>
                  {EGYPT_GOVERNORATES.map((gov) => (
                    <option key={gov.value} value={gov.value}>{locale === "ar" ? gov.label_ar : gov.label_en}</option>
                  ))}
                </select>
              </Field>
              <Field label="المدينة" required>
                <select required disabled={!governorate} value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">اختر المدينة</option>
                  {getCitiesForGovernorate(governorate).map((ct) => (
                    <option key={ct.value} value={ct.value}>{locale === "ar" ? ct.label_ar : ct.label_en}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label>الصور *</Label>
              <ImageUploader value={images} onChange={setImages} max={10} folder="listings" />
            </div>

            {/* Advanced */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-3 border-t border-border text-sm font-semibold hover:text-primary transition">
                <span>خيارات متقدمة (اختياري)</span>
                <ChevronDown className="h-4 w-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-3">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="العنوان بالإنجليزية">
                    <Input maxLength={200} value={title_en} onChange={(e) => setTitleEn(e.target.value)} />
                  </Field>
                  <Field label="الوصف بالإنجليزية">
                    <Textarea rows={2} value={description_en} onChange={(e) => setDescEn(e.target.value)} />
                  </Field>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="هاتف">
                    <Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
                  </Field>
                  <Field label="واتساب">
                    <Input type="tel" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="01XXXXXXXXX" />
                  </Field>
                </div>

                <Field label="نسبة العمولة للمسوقين (%)">
                  <Input type="number" min={0} max={100} step="0.1" value={commission} onChange={(e) => setCommission(e.target.value)} />
                </Field>

                {(type === "real_estate" || type === "land") && (
                  <>
                    <div className="grid sm:grid-cols-4 gap-4">
                      <Field label="النوع الفرعي">
                        <select value={propertySubtype} onChange={(e) => setPropertySubtype(e.target.value)}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                          <option value="">—</option>
                          {(type === "real_estate"
                            ? [["apartment","شقة"],["villa","فيلا"],["shop","محل"],["office","مكتب"],["warehouse","مخزن"]]
                            : [["agricultural","زراعية"],["industrial","صناعية"],["investment","استثمارية"],["building","بناء"]]
                          ).map(([v, ar]) => <option key={v} value={v}>{ar}</option>)}
                        </select>
                      </Field>
                      <Field label="المساحة (م²)"><Input type="number" min="0" value={areaSqm} onChange={(e) => setAreaSqm(e.target.value)} /></Field>
                      {type === "real_estate" && (
                        <>
                          <Field label="غرف النوم"><Input type="number" min="0" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} /></Field>
                          <Field label="الحمامات"><Input type="number" min="0" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} /></Field>
                        </>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <Field label="الغرض">
                        <select value={purpose} onChange={(e) => setPurpose(e.target.value as "sale" | "rent" | "")}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                          <option value="">—</option><option value="sale">للبيع</option><option value="rent">للإيجار</option>
                        </select>
                      </Field>
                      <Field label="نوع الملكية">
                        <select value={ownershipType} onChange={(e) => setOwnershipType(e.target.value)}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                          <option value="">—</option><option value="freehold">تمليك</option><option value="leasehold">إيجار طويل</option><option value="shared">مشترك</option>
                        </select>
                      </Field>
                      <Field label="العنوان التفصيلي (خاص)">
                        <Input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} maxLength={300} />
                      </Field>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Label>الموقع على الخريطة</Label>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>استخدم موقعي</Button>
                      {latitude && longitude && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setLatitude(""); setLongitude(""); }}>مسح</Button>
                      )}
                    </div>
                  </div>
                  {latitude && longitude && (
                    <div className="text-xs text-success font-medium">تم تحديد الموقع ✓ {latitude}, {longitude}</div>
                  )}
                  <MapView
                    markers={latitude && longitude ? [{ id: "preview", lat: Number(latitude), lng: Number(longitude), type, title, description: [city, governorate].filter(Boolean).join(" · ") }] : []}
                    center={latitude && longitude ? [Number(latitude), Number(longitude)] : undefined}
                    zoom={latitude && longitude ? 12 : 6}
                    onMapClick={latitude && longitude ? undefined : (coords) => {
                      setLatitude(coords.lat.toFixed(6));
                      setLongitude(coords.lng.toFixed(6));
                    }}
                  />
                </div>

                <Field label="PDF (كتالوج / مواصفات)">
                  <div className="flex items-center gap-2">
                    <label className="flex-1 inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-input bg-background cursor-pointer hover:bg-muted">
                      {pdfUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span className="truncate">{pdf_url ? pdf_url.split("/").pop() : "رفع ملف PDF"}</span>
                      <input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && onPdfUpload(e.target.files[0])} />
                    </label>
                    {pdf_url && <Button type="button" size="sm" variant="ghost" onClick={() => setPdf("")}><X className="h-4 w-4" /></Button>}
                  </div>
                </Field>
              </CollapsibleContent>
            </Collapsible>

            <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-card/95 backdrop-blur border-t border-border sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:pt-2">
              {planError && (
                <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                  {planError}
                </div>
              )}
              <Button type="submit" disabled={submitting} className="w-full h-12 bg-primary hover:bg-primary-hover text-base">
                {submitting && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                نشر الإعلان
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
