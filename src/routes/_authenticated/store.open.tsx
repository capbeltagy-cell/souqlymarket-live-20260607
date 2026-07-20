import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUploader, type UploadedImage } from "@/components/ImageUploader";
import { createStore, submitStoreForReview, getMyStore, updateStore } from "@/lib/stores.functions";
import { toast } from "sonner";
import { EGYPT_GOVERNORATES } from "@/lib/egypt.locations";
import { useEffect } from "react";
import { getArabicErrorMessage } from "@/lib/user-error";

export const Route = createFileRoute("/_authenticated/store/open")({
  head: () => ({ meta: [{ title: "افتح متجرك — سوقلي" }] }),
  component: OpenStoreWizard,
});

function OpenStoreWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [existing, setExisting] = useState<any>(null);
  const [form, setForm] = useState({
    name_ar: "",
    name_en: "",
    slug: "",
    business_type: "",
    description_ar: "",
    city: "",
    governorate: "",
    shipping_policy: "",
    return_policy: "",
    colors: { primary: "#2563eb", accent: "#0f172a" },
  });
  const [logo, setLogo] = useState<UploadedImage[]>([]);
  const [banner, setBanner] = useState<UploadedImage[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyStore().then((r) => {
      if (r.store) {
        setExisting(r.store);
        setForm((f) => ({ ...f, ...r.store, colors: { ...f.colors, ...(r.store.colors ?? {}) } }));
        if (r.store.logo_url) setLogo([{ url: r.store.logo_url, source: "uploaded" }]);
        if (r.store.banner_url) setBanner([{ url: r.store.banner_url, source: "uploaded" }]);
      }
    });
  }, []);

  async function save(submit: boolean) {
    setSaving(true);
    try {
      const payload = {
        ...form,
        logo_url: logo[0]?.url ?? null,
        banner_url: banner[0]?.url ?? null,
      };
      let id: string;
      if (existing?.id) {
        await updateStore({ data: { id: existing.id, ...payload } });
        id = existing.id;
      } else {
        const r = await createStore({ data: payload });
        id = r.id;
        setExisting({ id, slug: r.slug });
      }
      if (submit) {
        await submitStoreForReview({ data: { id } });
        toast.success("تم إرسال المتجر للمراجعة");
        navigate({ to: "/store" });
      } else {
        toast.success("تم الحفظ");
      }
    } catch (e: any) {
      toast.error(getArabicErrorMessage(e, "تعذر حفظ بيانات المتجر."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-1">افتح متجرك</h1>
        <p className="text-muted-foreground mb-6">الخطوة {step} من 3</p>

        {step === 1 && (
          <div className="rounded-xl bg-card border border-border p-6 space-y-4">
            <div>
              <Label>اسم المتجر بالعربية *</Label>
              <Input
                value={form.name_ar}
                onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
              />
            </div>
            <div>
              <Label>الاسم بالإنجليزية</Label>
              <Input
                value={form.name_en}
                onChange={(e) => setForm({ ...form, name_en: e.target.value })}
              />
            </div>
            <div>
              <Label>رابط المتجر (slug) *</Label>
              <Input
                value={form.slug}
                onChange={(e) =>
                  setForm({
                    ...form,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                  })
                }
                placeholder="my-store"
              />
              {form.slug && (
                <p className="text-xs text-muted-foreground mt-1">/stores/{form.slug}</p>
              )}
            </div>
            <div>
              <Label>نوع النشاط</Label>
              <Input
                value={form.business_type}
                onChange={(e) => setForm({ ...form, business_type: e.target.value })}
              />
            </div>
            <div>
              <Label>وصف المتجر</Label>
              <Textarea
                value={form.description_ar}
                onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المحافظة</Label>
                <select
                  className="w-full h-10 rounded-md border border-input px-3"
                  value={form.governorate}
                  onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                >
                  <option value="">اختر</option>
                  {EGYPT_GOVERNORATES.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label_ar}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>المدينة</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => setStep(2)}
              disabled={!form.name_ar || !form.slug}
            >
              التالي
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-xl bg-card border border-border p-6 space-y-6">
            <div>
              <Label className="mb-2 block">لوجو المتجر</Label>
              <ImageUploader value={logo} onChange={setLogo} max={1} folder="stores/logo" />
            </div>
            <div>
              <Label className="mb-2 block">صورة الغلاف</Label>
              <ImageUploader value={banner} onChange={setBanner} max={1} folder="stores/banner" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>اللون الأساسي</Label>
                <Input
                  type="color"
                  value={form.colors.primary}
                  onChange={(e) =>
                    setForm({ ...form, colors: { ...form.colors, primary: e.target.value } })
                  }
                  className="h-11 p-1"
                />
              </div>
              <div>
                <Label>اللون المساعد</Label>
                <Input
                  type="color"
                  value={form.colors.accent}
                  onChange={(e) =>
                    setForm({ ...form, colors: { ...form.colors, accent: e.target.value } })
                  }
                  className="h-11 p-1"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                السابق
              </Button>
              <Button className="flex-1" onClick={() => setStep(3)}>
                التالي
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="rounded-xl bg-card border border-border p-6 space-y-4">
            <div>
              <Label>سياسة الشحن</Label>
              <Textarea
                rows={4}
                value={form.shipping_policy}
                onChange={(e) => setForm({ ...form, shipping_policy: e.target.value })}
              />
            </div>
            <div>
              <Label>سياسة الاستبدال والاسترجاع</Label>
              <Textarea
                rows={4}
                value={form.return_policy}
                onChange={(e) => setForm({ ...form, return_policy: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                السابق
              </Button>
              <Button variant="outline" onClick={() => save(false)} disabled={saving}>
                حفظ كمسودة
              </Button>
              <Button className="flex-1" onClick={() => save(true)} disabled={saving}>
                إرسال للمراجعة
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
