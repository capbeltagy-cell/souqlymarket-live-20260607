import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ExternalLink, ImagePlus, Loader2, Save, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getMyStore, saveMyStore } from "@/lib/stores.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/store")({
  head: () => ({ meta: [{ title: "متجري — سوقلي" }] }),
  component: StoreDashboard,
});

type StoreRecord = {
  slug: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  accent_color: string;
  contact_phone: string | null;
  whatsapp: string | null;
  city: string | null;
  governorate: string | null;
  shipping_policy: string | null;
  return_policy: string | null;
  status: string;
};

const emptyForm: Omit<StoreRecord, "status"> = {
  slug: "",
  name_ar: "",
  name_en: "",
  description_ar: "",
  description_en: "",
  logo_url: "",
  banner_url: "",
  primary_color: "#0f766e",
  accent_color: "#f59e0b",
  contact_phone: "",
  whatsapp: "",
  city: "",
  governorate: "",
  shipping_policy: "",
  return_policy: "",
};

function StoreDashboard() {
  const loadStore = useServerFn(getMyStore);
  const saveStore = useServerFn(saveMyStore);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "banner" | null>(null);

  useEffect(() => {
    loadStore()
      .then((row) => {
        if (row) {
          const store = row as StoreRecord;
          const { status: currentStatus, ...fields } = store;
          setForm({ ...emptyForm, ...fields });
          setStatus(currentStatus);
        }
      })
      .catch((error) => toast.error((error as Error).message))
      .finally(() => setLoading(false));
  }, [loadStore]);

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function uploadImage(kind: "logo" | "banner", file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("اختار ملف صورة صالح");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة يجب ألا يتجاوز 5 ميجابايت");
      return;
    }

    setUploading(kind);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("سجّل الدخول مرة أخرى");
      const extension = file.name.split(".").pop()?.toLowerCase() || "webp";
      const path = `${authData.user.id}/${kind}-${Date.now()}.${extension}`;
      const { error } = await supabase.storage.from("store-media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("store-media").getPublicUrl(path);
      update(kind === "logo" ? "logo_url" : "banner_url", data.publicUrl);
      toast.success(kind === "logo" ? "تم رفع اللوجو" : "تم رفع صورة الغلاف");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(null);
    }
  }

  async function submit() {
    if (!form.name_ar.trim() || !form.slug.trim()) {
      toast.error("اكتب اسم المتجر والرابط");
      return;
    }
    setSaving(true);
    try {
      const result = await saveStore({
        data: {
          ...form,
          name_en: form.name_en || null,
          description_ar: form.description_ar || null,
          description_en: form.description_en || null,
          logo_url: form.logo_url || null,
          banner_url: form.banner_url || null,
          contact_phone: form.contact_phone || null,
          whatsapp: form.whatsapp || null,
          city: form.city || null,
          governorate: form.governorate || null,
          shipping_policy: form.shipping_policy || null,
          return_policy: form.return_policy || null,
        },
      });
      setStatus(result.status);
      toast.success(result.status === "published" ? "تم حفظ تحديثات المتجر" : "تم حفظ المتجر وإرساله للمراجعة");
    } catch (error) {
      toast.error((error as Error).message === "STORE_SLUG_TAKEN" ? "رابط المتجر مستخدم، اختار رابط مختلف" : (error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/20" dir="rtl">
      <SiteHeader />
      <main className="container-souqly py-8 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Store className="h-6 w-6" /> متجري</h1>
            <p className="text-sm text-muted-foreground mt-1">جهّز واجهة متجرك واربطها بمنتجات شركتك الحالية.</p>
          </div>
          <div className="flex gap-2 items-center">
            {status && <span className="rounded-full border px-3 py-1 text-xs">الحالة: {status}</span>}
            {form.slug && (
              <Button asChild variant="outline"><Link to="/stores/$slug" params={{ slug: form.slug }}><ExternalLink className="h-4 w-4 ms-2" /> معاينة</Link></Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div>
        ) : (
          <div className="grid lg:grid-cols-[1fr,360px] gap-6">
            <section className="rounded-xl border bg-card p-5 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="اسم المتجر بالعربي" value={form.name_ar} onChange={(v) => update("name_ar", v)} />
                <Field label="اسم المتجر بالإنجليزي" value={form.name_en ?? ""} onChange={(v) => update("name_en", v)} />
                <div className="sm:col-span-2">
                  <Label>رابط المتجر</Label>
                  <div className="flex mt-1"><span className="border border-e-0 rounded-s-md px-3 flex items-center text-xs text-muted-foreground bg-muted">souqlymarket.com/stores/</span><Input className="rounded-s-none" dir="ltr" value={form.slug} onChange={(e) => update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="my-store" /></div>
                </div>

                <ImageUploadField
                  label="لوجو المتجر"
                  value={form.logo_url ?? ""}
                  uploading={uploading === "logo"}
                  onUpload={(file) => uploadImage("logo", file)}
                  onClear={() => update("logo_url", "")}
                />
                <ImageUploadField
                  label="صورة الغلاف"
                  value={form.banner_url ?? ""}
                  uploading={uploading === "banner"}
                  onUpload={(file) => uploadImage("banner", file)}
                  onClear={() => update("banner_url", "")}
                />

                <Field label="رقم التواصل" value={form.contact_phone ?? ""} onChange={(v) => update("contact_phone", v)} />
                <Field label="واتساب" value={form.whatsapp ?? ""} onChange={(v) => update("whatsapp", v)} />
                <Field label="المحافظة" value={form.governorate ?? ""} onChange={(v) => update("governorate", v)} />
                <Field label="المدينة" value={form.city ?? ""} onChange={(v) => update("city", v)} />
                <ColorField label="اللون الأساسي" value={form.primary_color} onChange={(v) => update("primary_color", v)} />
                <ColorField label="لون العروض" value={form.accent_color} onChange={(v) => update("accent_color", v)} />
              </div>
              <Area label="وصف المتجر" value={form.description_ar ?? ""} onChange={(v) => update("description_ar", v)} />
              <Area label="سياسة الشحن" value={form.shipping_policy ?? ""} onChange={(v) => update("shipping_policy", v)} />
              <Area label="سياسة الاستبدال والاسترجاع" value={form.return_policy ?? ""} onChange={(v) => update("return_policy", v)} />
              <Button onClick={submit} disabled={saving || uploading !== null} className="w-full sm:w-auto">{saving ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : <Save className="h-4 w-4 ms-2" />} حفظ المتجر</Button>
            </section>

            <aside className="rounded-xl border bg-card overflow-hidden h-fit">
              <div className="h-36 bg-muted bg-cover bg-center" style={{ backgroundImage: form.banner_url ? `url(${form.banner_url})` : undefined }} />
              <div className="p-5 -mt-10 relative">
                <div className="h-20 w-20 rounded-xl border-4 border-card bg-muted overflow-hidden flex items-center justify-center">
                  {form.logo_url ? <img src={form.logo_url} alt="" className="h-full w-full object-cover" /> : <Store className="h-8 w-8" />}
                </div>
                <h2 className="font-bold text-xl mt-3">{form.name_ar || "اسم متجرك"}</h2>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{form.description_ar || "وصف مختصر يوضح نشاط المتجر والمنتجات التي يقدمها."}</p>
                <div className="h-2 rounded-full mt-5" style={{ background: `linear-gradient(90deg, ${form.primary_color}, ${form.accent_color})` }} />
              </div>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div><Label>{label}</Label><Input className="mt-1" value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

function ImageUploadField({ label, value, uploading, onUpload, onClear }: { label: string; value: string; uploading: boolean; onUpload: (file?: File) => void; onClear: () => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 rounded-lg border border-dashed p-3 space-y-2">
        {value ? <img src={value} alt="" className="h-24 w-full rounded-md object-cover bg-muted" /> : <div className="h-24 rounded-md bg-muted grid place-items-center text-muted-foreground"><ImagePlus className="h-7 w-7" /></div>}
        <div className="flex gap-2">
          <Button asChild type="button" size="sm" variant="outline" disabled={uploading}>
            <label className="cursor-pointer flex-1">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : <ImagePlus className="h-4 w-4 ms-2" />}
              {uploading ? "جارٍ الرفع" : "اختيار صورة"}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" disabled={uploading} onChange={(event) => onUpload(event.target.files?.[0])} />
            </label>
          </Button>
          {value && <Button type="button" size="icon" variant="ghost" onClick={onClear} aria-label="حذف الصورة"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div><Label>{label}</Label><div className="flex gap-2 mt-1"><Input type="color" className="w-14 p-1" value={value} onChange={(event) => onChange(event.target.value)} /><Input dir="ltr" value={value} onChange={(event) => onChange(event.target.value)} /></div></div>;
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div><Label>{label}</Label><Textarea className="mt-1 min-h-24" value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}
