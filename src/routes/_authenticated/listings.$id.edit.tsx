import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { updateListing, deleteListing } from "@/lib/listings.functions";
import { EGYPT_GOVERNORATES, getCitiesForGovernorate } from "@/lib/egypt.locations";
import { ImageUploader, type UploadedImage } from "@/components/ImageUploader";

export const Route = createFileRoute("/_authenticated/listings/$id/edit")({
  head: () => ({ meta: [{ title: "تعديل الإعلان — Souqly" }] }),
  component: EditListing,
});

type Row = {
  id: string; company_id: string; type: string;
  title_ar: string; title_en: string;
  description_ar: string | null; description_en: string | null;
  category: string | null; price: number | null;
  city: string | null; governorate: string | null;
  images: string[] | null; image_sources: string[] | null;
  phone: string | null; whatsapp: string | null;
  status: string;
  commission_percentage: number | null;
  marketer_promotion_enabled: boolean | null;
  commission_type: string | null;
  commission_fixed_amount: number | null;
  conversion_goal: string | null;
  promotion_conditions: string | null;
  promotion_status: string | null;
};

function EditListing() {
  const { id } = Route.useParams();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { user } = useAuth();
  const navigate = useNavigate();
  const update = useServerFn(updateListing);
  const remove = useServerFn(deleteListing);

  const [loading, setLoading] = useState(true);
  const [notAuthorized, setNotAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState<Row | null>(null);

  // Editable fields
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [price, setPrice] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [status, setStatus] = useState<"approved" | "hidden" | "pending_review">("approved");

  // Promotion
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [commissionType, setCommissionType] = useState<"percentage" | "fixed">("percentage");
  const [commissionPct, setCommissionPct] = useState("5");
  const [commissionFixed, setCommissionFixed] = useState("");
  const [conversionGoal, setConversionGoal] = useState("order_paid");
  const [promoConditions, setPromoConditions] = useState("");
  const [promoStatus, setPromoStatus] = useState<"active" | "paused" | "ended">("active");
  const [campaignBudget, setCampaignBudget] = useState("");
  const [campaignMaxConversions, setCampaignMaxConversions] = useState("");

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from("listings")
        .select("id, company_id, type, title_ar, title_en, description_ar, description_en, category, price, city, governorate, images, image_sources, phone, whatsapp, status, commission_percentage, marketer_promotion_enabled, commission_type, commission_fixed_amount, conversion_goal, promotion_conditions, promotion_status, campaign_budget_egp, campaign_max_conversions, companies!inner(owner_id)")
        .eq("id", id)
        .maybeSingle() as { data: (Row & { companies: { owner_id: string } | null }) | null };
      if (!data) { setLoading(false); setNotAuthorized(true); return; }
      if (data.companies?.owner_id !== user.id) { setNotAuthorized(true); setLoading(false); return; }
      setRow(data);
      setTitleAr(data.title_ar ?? "");
      setTitleEn(data.title_en ?? "");
      setDescAr(data.description_ar ?? "");
      setDescEn(data.description_en ?? "");
      setPrice(data.price != null ? String(data.price) : "");
      setGovernorate(data.governorate ?? "");
      setCity(data.city ?? "");
      setPhone(data.phone ?? "");
      setWhatsapp(data.whatsapp ?? "");
      setStatus((data.status as never) ?? "approved");
      const imgs = data.images ?? [];
      const srcs = data.image_sources ?? [];
      setImages(imgs.map((url, i) => ({
        url,
        source: (srcs[i] === "live_capture" ? "live_capture" : "uploaded") as "live_capture" | "uploaded",
      })));
      setPromoEnabled(!!data.marketer_promotion_enabled);
      setCommissionType((data.commission_type as never) ?? "percentage");
      setCommissionPct(String(data.commission_percentage ?? 5));
      setCommissionFixed(String(data.commission_fixed_amount ?? ""));
      setConversionGoal(data.conversion_goal ?? "order_paid");
      setPromoConditions(data.promotion_conditions ?? "");
      setPromoStatus((data.promotion_status as never) ?? "active");
      setLoading(false);
    })();
  }, [id, user]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await update({
        data: {
          id,
          title_ar: titleAr,
          title_en: titleEn || titleAr,
          description_ar: descAr || null,
          description_en: descEn || null,
          price: price ? Number(price) : null,
          governorate,
          city,
          images: images.map((i) => i.url),
          phone: phone || null,
          whatsapp: whatsapp || null,
          status,
          commission_percentage: Number(commissionPct) || 0,
          marketer_promotion_enabled: promoEnabled,
          commission_type: commissionType,
          commission_fixed_amount: commissionFixed ? Number(commissionFixed) : 0,
          conversion_goal: conversionGoal || null,
          promotion_conditions: promoConditions || null,
          promotion_status: promoStatus,
        },
      });
      toast.success(ar ? "تم حفظ التغييرات" : "Saved");
      navigate({ to: "/listings/$id", params: { id } });
    } catch (err) { toast.error((err as Error).message); }
    finally { setSaving(false); }
  };

  const onDelete = async () => {
    if (!confirm(ar ? "حذف الإعلان نهائياً؟" : "Delete this listing?")) return;
    try {
      await remove({ data: { id } });
      toast.success(ar ? "تم الحذف" : "Deleted");
      navigate({ to: "/dashboard" });
    } catch (err) { toast.error((err as Error).message); }
  };

  if (loading) {
    return <div className="min-h-screen flex flex-col"><SiteHeader /><div className="flex-1 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div><SiteFooter /></div>;
  }
  if (notAuthorized || !row) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 grid place-items-center p-8 text-center">
          <div>
            <h1 className="text-xl font-bold mb-2">{ar ? "غير مصرح" : "Not authorized"}</h1>
            <p className="text-muted-foreground text-sm mb-4">{ar ? "لا يمكنك تعديل هذا الإعلان." : "You cannot edit this listing."}</p>
            <Button asChild variant="outline"><Link to="/dashboard">{ar ? "العودة" : "Back"}</Link></Button>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const cities = governorate ? getCitiesForGovernorate(governorate) : [];

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <form onSubmit={onSave} className="container-souqly py-6 flex-1 space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm"><Link to="/listings/$id" params={{ id }}><ArrowLeft className="h-4 w-4 mr-1" />{ar ? "العودة للإعلان" : "Back"}</Link></Button>
          <h1 className="text-2xl font-bold">{ar ? "تعديل الإعلان" : "Edit listing"}</h1>
        </div>

        <section className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h2 className="font-semibold">{ar ? "المحتوى" : "Content"}</h2>
          <div><Label>{ar ? "العنوان (عربي)" : "Title (Arabic)"}</Label><Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} required minLength={2} /></div>
          <div><Label>{ar ? "العنوان (إنجليزي)" : "Title (English)"}</Label><Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} /></div>
          <div><Label>{ar ? "الوصف (عربي)" : "Description (Arabic)"}</Label><Textarea rows={4} value={descAr} onChange={(e) => setDescAr(e.target.value)} /></div>
          <div><Label>{ar ? "الوصف (إنجليزي)" : "Description (English)"}</Label><Textarea rows={4} value={descEn} onChange={(e) => setDescEn(e.target.value)} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>{ar ? "السعر" : "Price (EGP)"}</Label><Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            <div>
              <Label>{ar ? "الحالة" : "Status"}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as never)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">{ar ? "منشور" : "Published"}</SelectItem>
                  <SelectItem value="hidden">{ar ? "مخفي" : "Hidden"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h2 className="font-semibold">{ar ? "الموقع" : "Location"}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>{ar ? "المحافظة" : "Governorate"}</Label>
              <Select value={governorate} onValueChange={(v) => { setGovernorate(v); setCity(""); }}>
                <SelectTrigger><SelectValue placeholder={ar ? "اختر" : "Select"} /></SelectTrigger>
                <SelectContent>
                  {EGYPT_GOVERNORATES.map((g) => <SelectItem key={g.value} value={g.value}>{ar ? g.label_ar : g.label_en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{ar ? "المدينة" : "City"}</Label>
              <Select value={city} onValueChange={setCity} disabled={!governorate}>
                <SelectTrigger><SelectValue placeholder={ar ? "اختر" : "Select"} /></SelectTrigger>
                <SelectContent>
                  {cities.map((c) => <SelectItem key={c.value} value={c.value}>{ar ? c.label_ar : c.label_en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h2 className="font-semibold">{ar ? "التواصل" : "Contact"}</h2>
          <p className="text-xs text-muted-foreground">{ar ? "عند تفعيل التسويق بالعمولة على هذا المنتج، يتم إخفاء بيانات التواصل عن العامة تلقائياً." : "When marketer promotion is enabled, contact details are auto-masked from the public."}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>{ar ? "الهاتف" : "Phone"}</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+201..." /></div>
            <div><Label>WhatsApp</Label><Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+201..." /></div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h2 className="font-semibold">{ar ? "الصور" : "Images"}</h2>
          <ImageUploader value={images} onChange={setImages} max={10} />
        </section>

        <section className="rounded-lg border border-primary/40 bg-primary/5 p-5 space-y-3">
          <div className="flex items-start gap-2">
            <input type="checkbox" id="promo" checked={promoEnabled} onChange={(e) => setPromoEnabled(e.target.checked)} className="mt-1 h-4 w-4" />
            <label htmlFor="promo" className="cursor-pointer">
              <div className="font-semibold">{ar ? "السماح للمسوقين بتسويق هذا المنتج" : "Allow marketers to promote this product"}</div>
              <p className="text-xs text-muted-foreground mt-1">{ar ? "سيظهر منتجك في فرص الربح وسيتم إنشاء عمولة تلقائياً عند إتمام صفقة عبر رابط المسوق." : "Your product appears in earning opportunities; a commission is auto-created when a deal closes through a marketer's link."}</p>
            </label>
          </div>
          {promoEnabled && (
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div>
                <Label>{ar ? "نوع العمولة" : "Commission type"}</Label>
                <Select value={commissionType} onValueChange={(v) => setCommissionType(v as never)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{ar ? "نسبة مئوية" : "Percentage"}</SelectItem>
                    <SelectItem value="fixed">{ar ? "مبلغ ثابت" : "Fixed amount"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {commissionType === "percentage" ? (
                <div><Label>{ar ? "النسبة %" : "Percentage %"}</Label><Input type="number" min="0" max="100" step="0.1" value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)} /></div>
              ) : (
                <div><Label>{ar ? "المبلغ (جنيه)" : "Fixed amount (EGP)"}</Label><Input type="number" min="0" step="0.01" value={commissionFixed} onChange={(e) => setCommissionFixed(e.target.value)} /></div>
              )}
              <div>
                <Label>{ar ? "هدف التحويل" : "Conversion goal"}</Label>
                <Select value={conversionGoal} onValueChange={setConversionGoal}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order_paid">{ar ? "طلب مدفوع" : "Paid order"}</SelectItem>
                    <SelectItem value="lead">{ar ? "عميل محتمل" : "Lead"}</SelectItem>
                    <SelectItem value="quotation">{ar ? "طلب عرض سعر" : "Quotation"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{ar ? "حالة الحملة" : "Campaign status"}</Label>
                <Select value={promoStatus} onValueChange={(v) => setPromoStatus(v as never)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{ar ? "نشطة" : "Active"}</SelectItem>
                    <SelectItem value="paused">{ar ? "متوقفة" : "Paused"}</SelectItem>
                    <SelectItem value="ended">{ar ? "منتهية" : "Ended"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>{ar ? "شروط العمولة (اختياري)" : "Commission conditions (optional)"}</Label>
                <Textarea rows={2} value={promoConditions} onChange={(e) => setPromoConditions(e.target.value)} />
              </div>
            </div>
          )}
        </section>

        <div className="flex flex-wrap gap-3 justify-between items-center pt-2">
          <Button type="button" variant="destructive" onClick={onDelete}>{ar ? "حذف الإعلان" : "Delete listing"}</Button>
          <Button type="submit" disabled={saving} className="gap-2 bg-primary hover:bg-primary-hover">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {ar ? "حفظ التغييرات" : "Save changes"}
          </Button>
        </div>
      </form>
      <SiteFooter />
    </div>
  );
}
