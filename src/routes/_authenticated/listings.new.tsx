import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, PlusCircle, Sparkles, Upload, X } from "lucide-react";
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
import { createListing } from "@/lib/listings.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/listings/new")({
  head: () => ({ meta: [{ title: "New Listing — Souqly" }] }),
  component: NewListing,
});

function NewListing() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fetchPlan = useServerFn(getMyPlan);
  const create = useServerFn(createListing);
  const [planInfo, setPlanInfo] = useState<{ plan: string; maxListings: number; currentListings: number; hasCompany: boolean } | null>(null);

  const [type, setType] = useState<ListingType>("product");
  const [title_ar, setTitleAr] = useState("");
  const [title_en, setTitleEn] = useState("");
  const [description_ar, setDescAr] = useState("");
  const [description_en, setDescEn] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [commission, setCommission] = useState("5");
  const [images, setImages] = useState<string[]>([]);
  const [video_url, setVideo] = useState("");
  const [pdf_url, setPdf] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const p = await fetchPlan();
        let currentListings = 0;
        if (p.hasCompany) {
          const { data: company } = await supabase.from("companies").select("id").eq("owner_id", user.id).maybeSingle();
          if (company) {
            const { count } = await supabase.from("listings").select("id", { count: "exact", head: true }).eq("company_id", company.id);
            currentListings = count ?? 0;
          }
        }
        setPlanInfo({ plan: p.plan, maxListings: p.limits.maxListings, currentListings, hasCompany: p.hasCompany });
      } catch { /* noop */ }
    })();
  }, [user, fetchPlan]);

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

  const onImageUpload = async (file: File) => {
    const url = await uploadFile(file, "image");
    if (url) setImages((prev) => [...prev, url]);
  };
  const onVideoUpload = async (file: File) => {
    const url = await uploadFile(file, "video");
    if (url) setVideo(url);
  };
  const onPdfUpload = async (file: File) => {
    const url = await uploadFile(file, "pdf");
    if (url) setPdf(url);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planInfo?.hasCompany) { toast.error(t("need_company_first")); return; }
    if (atLimit) { toast.error(t("plan_limits_reached")); return; }
    setSubmitting(true);
    try {
      const res = await create({
        data: {
          type,
          title_ar, title_en,
          description_ar: description_ar || null,
          description_en: description_en || null,
          country: country || null,
          city: city || null,
          location: null,
          category: null,
          price: price ? Number(price) : null,
          currency,
          commission_percentage: Number(commission),
          images,
          video_url: video_url || null,
          pdf_url: pdf_url || null,
        } as never,
      });
      toast.success(t("listing_published"));
      navigate({ to: "/listings/$id", params: { id: res.id } });
    } catch (e) { toast.error((e as Error).message); }
    finally { setSubmitting(false); }
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
                <div className="text-muted-foreground">{t("upgrade_to_unlock")}</div>
              </div>
              <Button asChild className="bg-primary hover:bg-primary-hover gap-2">
                <Link to="/pricing"><Sparkles className="h-4 w-4" />{t("upgrade")}</Link>
              </Button>
            </div>
          )}

          <form onSubmit={onSubmit} className="rounded-lg border border-border bg-card p-6 shadow-card space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
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
              <Field label={t("field_country")}>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Saudi Arabia" />
              </Field>
            </div>
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
              <Field label={t("field_price")}>
                <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
              </Field>
              <Field label="Currency">
                <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={4} />
              </Field>
              <Field label={t("field_commission")} required>
                <Input required type="number" min={0} max={100} step="0.1" value={commission} onChange={(e) => setCommission(e.target.value)} />
              </Field>
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

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t("field_video")}>
                <UploadButton url={video_url} accept="video/*" onChange={onVideoUpload} onClear={() => setVideo("")} />
              </Field>
              <Field label={t("field_pdf")}>
                <UploadButton url={pdf_url} accept="application/pdf" onChange={onPdfUpload} onClear={() => setPdf("")} />
              </Field>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={submitting || uploading || !planInfo?.hasCompany} className="bg-primary hover:bg-primary-hover">
                {submitting && <Loader2 className="h-4 w-4 animate-spin me-2" />}{t("submit_listing")}
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
