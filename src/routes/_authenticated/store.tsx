import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Save, Store } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getMyStore, saveMyStore } from "@/lib/stores.functions";

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
      toast.success("تم حفظ المتجر وإرساله للمراجعة");
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
                <Field label="رابط اللوجو" value={form.logo_url ?? ""} onChange={(v) => update("logo_url", v)} />
                <Field label="رابط صورة الغلاف" value={form.banner_url ?? ""} onChange={(v) => update("banner_url", v)} />
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
              <Button onClick={submit} disabled={saving} className="w-full sm:w-auto">{saving ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : <Save className="h-4 w-4 ms-2" />} حفظ المتجر</Button>
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
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div><Label>{label}</Label><div className="flex gap-2 mt-1"><Input type="color" className="w-14 p-1" value={value} onChange={(event) => onChange(event.target.value)} /><Input dir="ltr" value={value} onChange={(event) => onChange(event.target.value)} /></div></div>;
}
function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div><Label>{label}</Label><Textarea className="mt-1 min-h-24" value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}
