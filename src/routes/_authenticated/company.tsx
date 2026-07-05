import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Loader2, Upload } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/I18nProvider";
import { getMyCompany, upsertMyCompany } from "@/lib/companies.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LocationPicker } from "@/components/LocationPicker";
import { BilingualField } from "@/components/BilingualField";

export const Route = createFileRoute("/_authenticated/company")({
  head: () => ({ meta: [{ title: "My Company — Souqly" }] }),
  component: CompanyEdit,
});

type Form = {
  name_ar: string; name_en: string;
  description_ar: string; description_en: string;
  industry: string; country: string; city: string;
  website: string; email: string; phone: string;
  logo_url: string; cover_url: string;
};

const empty: Form = {
  name_ar: "", name_en: "", description_ar: "", description_en: "",
  industry: "", country: "", city: "", website: "", email: "", phone: "",
  logo_url: "", cover_url: "",
};

function CompanyEdit() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fetchMine = useServerFn(getMyCompany);
  const save = useServerFn(upsertMyCompany);
  const [form, setForm] = useState<Form>(empty);
  const [gov, setGov] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);

  useEffect(() => {
    fetchMine().then((r) => {
      if (r.company) {
        const c = r.company as Partial<Form> & { governorate?: string };
        setForm({ ...empty, ...Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v ?? ""])) as Form });
        if (c.governorate) setGov(c.governorate);
      }
    }).finally(() => setLoading(false));
  }, [fetchMine]);

  const upload = async (kind: "logo" | "cover", file: File) => {
    if (!user) return;
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("company-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("company-assets").getPublicUrl(path);
      setForm((f) => ({ ...f, [kind === "logo" ? "logo_url" : "cover_url"]: data.publicUrl }));
      toast.success("Uploaded");
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploading(null); }
  };

  const normalizeUrl = (raw: string): string | null => {
    const v = raw.trim();
    if (!v) return null;
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  };
  const isArabic = (typeof document !== "undefined" && document.documentElement.dir === "rtl");
  const msg = (ar: string, en: string) => (isArabic ? ar : en);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Manual validation (no native type=url/email so we control the messages)
    const website = normalizeUrl(form.website);
    if (form.website.trim() && website) {
      try { new URL(website); } catch {
        toast.error(msg("رابط الموقع غير صالح. مثال: example.com", "Invalid website URL. Example: example.com"));
        return;
      }
    }
    const email = form.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(msg("البريد الإلكتروني غير صالح.", "Invalid email address."));
      return;
    }
    setSubmitting(true);
    try {
      const res = await save({ data: { ...form, website: website, email: email || null } as never });
      toast.success(res.created ? t("company_created") : t("company_updated"));
      navigate({ to: "/companies/$id", params: { id: res.id } });
    } catch (e) { toast.error((e as Error).message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <Shell><div className="p-10 text-center text-muted-foreground">{t("loading")}</div></Shell>;

  return (
    <Shell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("company_profile")}</h1>
        </div>
        <form onSubmit={onSubmit} className="rounded-lg border border-border bg-card p-6 shadow-card space-y-5">
          <BilingualField
            label={locale === "ar" ? "اسم الشركة" : "Company name"}
            required
            hasSecondary={!!form.name_en && locale === "ar"}
            primary={
              locale === "ar" ? (
                <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value, name_en: form.name_en || e.target.value })} required dir="rtl" placeholder="مثال: مصنع النور للأثاث" />
              ) : (
                <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value, name_ar: form.name_ar || e.target.value })} required placeholder="e.g. Al-Nour Furniture Factory" />
              )
            }
            secondary={
              locale === "ar" ? (
                <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} placeholder="Company name in English" />
              ) : (
                <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} dir="rtl" placeholder="اسم الشركة بالعربية" />
              )
            }
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t("field_industry")}>
              <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder={locale === "ar" ? "مثال: أثاث، ملابس، أغذية" : "e.g. Furniture, Clothing, Food"} />
            </Field>
            <Field label={t("profile_phone")}>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+20 1X XXX XXXX" />
            </Field>
            <Field label="Email">
              <Input type="text" inputMode="email" placeholder={locale === "ar" ? "info@yourcompany.com" : "info@yourcompany.com"} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Website">
              <Input type="text" inputMode="url" placeholder="yourcompany.com" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </Field>
          </div>

          <LocationPicker
            required
            governorate={gov}
            city={form.city}
            onChange={({ governorate, city }) => { setGov(governorate); setForm({ ...form, country: "Egypt", city }); }}
          />


          <BilingualField
            label={locale === "ar" ? "نبذة عن الشركة" : "About the company"}
            hasSecondary={!!form.description_en && locale === "ar"}
            primary={
              locale === "ar" ? (
                <Textarea rows={4} dir="rtl" value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} placeholder="اكتب وصفاً قصيراً عن نشاط شركتك وما يميزها" />
              ) : (
                <Textarea rows={4} value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} placeholder="Briefly describe what your company does and what makes it unique" />
              )
            }
            secondary={
              locale === "ar" ? (
                <Textarea rows={3} value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} placeholder="English description" />
              ) : (
                <Textarea rows={3} dir="rtl" value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} placeholder="وصف بالعربية" />
              )
            }
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <FileField label={t("company_logo")} url={form.logo_url} busy={uploading === "logo"} onChange={(f) => upload("logo", f)} />
            <FileField label={t("company_cover")} url={form.cover_url} busy={uploading === "cover"} onChange={(f) => upload("cover", f)} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary-hover">
              {submitting && <Loader2 className="h-4 w-4 animate-spin me-2" />}{t("profile_save")}
            </Button>
            <Button asChild type="button" variant="outline"><Link to="/dashboard">{t("nav_dashboard")}</Link></Button>
          </div>
        </form>
      </div>
    </Shell>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && " *"}</Label>
      {children}
    </div>
  );
}

function FileField({ label, url, busy, onChange }: { label: string; url: string; busy: boolean; onChange: (f: File) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        {url ? <img src={url} alt="" className="h-12 w-12 rounded object-cover border border-border" /> : <div className="h-12 w-12 rounded bg-muted border border-border" />}
        <label className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-input bg-background cursor-pointer hover:bg-muted">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span>Upload</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])} />
        </label>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
