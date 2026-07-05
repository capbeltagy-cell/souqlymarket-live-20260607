import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMarketerGuard } from "@/hooks/useMarketerGuard";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, ImageIcon, Loader2, MapPin, Phone, Sparkles, Upload } from "lucide-react";
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
import { translateEgyptCity, translateEgyptGovernorate } from "@/lib/egypt.locations";

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

/** Common Egyptian business categories — searchable dropdown, no new tables. */
const INDUSTRIES: { value: string; ar: string; en: string }[] = [
  { value: "retail", ar: "تجارة تجزئة", en: "Retail" },
  { value: "wholesale", ar: "تجارة جملة", en: "Wholesale" },
  { value: "manufacturing", ar: "تصنيع", en: "Manufacturing" },
  { value: "food_beverage", ar: "أغذية ومشروبات", en: "Food & Beverage" },
  { value: "restaurants", ar: "مطاعم", en: "Restaurants" },
  { value: "real_estate", ar: "عقارات", en: "Real Estate" },
  { value: "construction", ar: "مقاولات وإنشاءات", en: "Construction" },
  { value: "furniture", ar: "أثاث", en: "Furniture" },
  { value: "clothing", ar: "ملابس ومنسوجات", en: "Clothing & Textiles" },
  { value: "automotive", ar: "سيارات وقطع غيار", en: "Automotive" },
  { value: "electronics", ar: "إلكترونيات", en: "Electronics" },
  { value: "shipping", ar: "شحن ولوجستيات", en: "Shipping & Logistics" },
  { value: "agriculture", ar: "زراعة", en: "Agriculture" },
  { value: "medical", ar: "طبي وصيدلة", en: "Medical & Pharma" },
  { value: "services", ar: "خدمات", en: "Services" },
  { value: "technology", ar: "تكنولوجيا وبرمجيات", en: "Technology & Software" },
  { value: "other", ar: "أخرى", en: "Other" },
];

type StepId = 1 | 2 | 3 | 4 | 5;
const STEPS: { id: StepId; ar: string; en: string; icon: typeof Building2 }[] = [
  { id: 1, ar: "الأساسيات", en: "Basics", icon: Building2 },
  { id: 2, ar: "الشعار والغلاف", en: "Logo & Cover", icon: ImageIcon },
  { id: 3, ar: "الوصف", en: "Description", icon: Sparkles },
  { id: 4, ar: "التواصل", en: "Contact", icon: Phone },
  { id: 5, ar: "مراجعة", en: "Review", icon: Check },
];

function CompanyEdit() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fetchMine = useServerFn(getMyCompany);
  const save = useServerFn(upsertMyCompany);
  const [form, setForm] = useState<Form>(empty);
  const [gov, setGov] = useState("");
  const [step, setStep] = useState<StepId>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  const [hasExisting, setHasExisting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const draftKey = user ? `souqly.company-wizard.${user.id}` : null;

  // Load: prefer live company row; otherwise restore local draft.
  useEffect(() => {
    fetchMine().then((r) => {
      if (r.company) {
        const c = r.company as Partial<Form> & { governorate?: string };
        setForm({ ...empty, ...Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v ?? ""])) as Form });
        if (c.governorate) setGov(c.governorate);
        setHasExisting(true);
        return;
      }
      if (!draftKey || typeof window === "undefined") return;
      try {
        const raw = window.localStorage.getItem(draftKey);
        if (!raw) return;
        const draft = JSON.parse(raw) as { form?: Form; gov?: string; step?: StepId; savedAt?: number };
        if (draft.form) setForm({ ...empty, ...draft.form });
        if (draft.gov) setGov(draft.gov);
        if (draft.step && draft.step >= 1 && draft.step <= 5) setStep(draft.step as StepId);
        if (draft.savedAt) setSavedAt(draft.savedAt);
        // Only announce restoration if there's meaningful content saved.
        const hasContent = !!(draft.form && (draft.form.name_ar || draft.form.name_en || draft.form.description_ar || draft.form.description_en || draft.form.city || draft.form.logo_url));
        if (hasContent) setDraftRestored(true);
      } catch { /* ignore malformed draft */ }
    }).finally(() => setLoading(false));
  }, [fetchMine, draftKey]);

  // Autosave: debounced write of form + gov + step to localStorage while editing.
  useEffect(() => {
    if (loading || !draftKey || typeof window === "undefined") return;
    const t = window.setTimeout(() => {
      try {
        const ts = Date.now();
        window.localStorage.setItem(draftKey, JSON.stringify({ form, gov, step, savedAt: ts }));
        setSavedAt(ts);
      } catch { /* quota/private-mode: ignore */ }
    }, 400);
    return () => window.clearTimeout(t);
  }, [form, gov, step, loading, draftKey]);

  const clearDraft = () => {
    if (!draftKey || typeof window === "undefined") return;
    try { window.localStorage.removeItem(draftKey); } catch { /* ignore */ }
    setDraftRestored(false);
    setSavedAt(null);
  };

  const discardDraft = () => {
    clearDraft();
    setForm(empty);
    setGov("");
    setStep(1);
    toast.success(locale === "ar" ? "تم مسح المسودة" : "Draft cleared");
  };


  const upload = async (kind: "logo" | "cover", file: File) => {
    if (!user) return;
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("company-assets").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      // Bucket is private; use a long-lived signed URL so the logo renders everywhere.
      const { data, error: sErr } = await supabase.storage.from("company-assets").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !data?.signedUrl) throw sErr ?? new Error("Sign URL failed");
      setForm((f) => ({ ...f, [kind === "logo" ? "logo_url" : "cover_url"]: data.signedUrl }));
      toast.success(locale === "ar" ? "تم الرفع" : "Uploaded");
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploading(null); }
  };

  const normalizeUrl = (raw: string): string | null => {
    const v = raw.trim();
    if (!v) return null;
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  };
  const msg = (ar: string, en: string) => (locale === "ar" ? ar : en);

  const primaryName = form.name_ar || form.name_en;

  const validateStep = (s: StepId): string | null => {
    if (s === 1) {
      if (!primaryName.trim()) return msg("أدخل اسم الشركة", "Enter the company name");
      if (!gov || !form.city) return msg("اختر المحافظة والمدينة", "Select governorate and city");
    }
    if (s === 4) {
      const website = normalizeUrl(form.website);
      if (form.website.trim() && website) {
        try { new URL(website); } catch { return msg("رابط الموقع غير صالح", "Invalid website URL"); }
      }
      const email = form.email.trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg("البريد الإلكتروني غير صالح", "Invalid email address");
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    if (step < 5) setStep((s) => (s + 1) as StepId);
  };
  const goBack = () => { if (step > 1) setStep((s) => (s - 1) as StepId); };

  const submit = async () => {
    for (const s of [1, 4] as StepId[]) {
      const err = validateStep(s);
      if (err) { setStep(s); toast.error(err); return; }
    }
    setSubmitting(true);
    try {
      const website = normalizeUrl(form.website);
      const email = form.email.trim();
      const payload: Form = {
        ...form,
        name_en: form.name_en || form.name_ar,
        name_ar: form.name_ar || form.name_en,
      };
      const res = await save({ data: { ...payload, website, email: email || null } as never });
      toast.success(res.created ? t("company_created") : t("company_updated"));
      clearDraft();
      navigate({ to: "/companies/$id", params: { id: res.id } });
    } catch (e) { toast.error((e as Error).message); }
    finally { setSubmitting(false); }
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 5) goNext();
    else void submit();
  };

  if (loading) return <Shell><div className="p-10 text-center text-muted-foreground">{t("loading")}</div></Shell>;

  return (
    <Shell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{hasExisting ? t("company_profile") : msg("إنشاء شركتك", "Create your company")}</h1>
        </div>

        {draftRestored && !hasExisting && (
          <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm flex items-center justify-between gap-3">
            <span className="text-foreground">
              {msg("تم استعادة مسودتك السابقة.", "Your previous draft was restored.")}
            </span>
            <button type="button" onClick={discardDraft} className="text-xs font-medium text-primary hover:underline">
              {msg("ابدأ من جديد", "Start over")}
            </button>
          </div>
        )}

        <Stepper current={step} onJump={(id) => id < step && setStep(id)} locale={locale} />



        <form onSubmit={onFormSubmit} className="mt-5 rounded-xl border border-border bg-card p-6 shadow-card space-y-5">
          {step === 1 && (
            <div className="space-y-5">
              <BilingualField
                label={msg("اسم الشركة", "Company name")}
                required
                hasSecondary={!!(locale === "ar" ? form.name_en : form.name_ar)}
                primary={
                  locale === "ar" ? (
                    <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} required dir="rtl" placeholder="مثال: مصنع النور للأثاث" autoFocus />
                  ) : (
                    <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} required placeholder="e.g. Al-Nour Furniture Factory" autoFocus />
                  )
                }
                secondary={
                  locale === "ar"
                    ? <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} placeholder="Company name in English" />
                    : <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} dir="rtl" placeholder="اسم الشركة بالعربية" />
                }
              />

              <Field label={msg("نوع النشاط / الصناعة", "Business type / Industry")}>
                <select
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">{msg("اختر نوع النشاط", "Select business type")}</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i.value} value={i.value}>{locale === "ar" ? i.ar : i.en}</option>
                  ))}
                </select>
              </Field>

              <LocationPicker
                required
                governorate={gov}
                city={form.city}
                onChange={({ governorate, city }) => { setGov(governorate); setForm({ ...form, country: "Egypt", city }); }}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                {msg("أضف شعاراً وصورة غلاف احترافية لتظهر شركتك بأفضل شكل. (اختياري)",
                     "Add a professional logo and cover image so your company looks its best. (Optional)")}
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <FileField label={t("company_logo")} url={form.logo_url} busy={uploading === "logo"} onChange={(f) => upload("logo", f)} />
                <FileField label={t("company_cover")} url={form.cover_url} busy={uploading === "cover"} onChange={(f) => upload("cover", f)} />
              </div>
            </div>
          )}

          {step === 3 && (
            <BilingualField
              label={msg("نبذة عن الشركة", "About the company")}
              hasSecondary={!!(locale === "ar" ? form.description_en : form.description_ar)}
              primary={
                locale === "ar"
                  ? <Textarea rows={6} dir="rtl" value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} placeholder="اكتب وصفاً قصيراً عن نشاط شركتك وما يميزها" />
                  : <Textarea rows={6} value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} placeholder="Briefly describe what your company does and what makes it unique" />
              }
              secondary={
                locale === "ar"
                  ? <Textarea rows={4} value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} placeholder="English description" />
                  : <Textarea rows={4} dir="rtl" value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} placeholder="وصف بالعربية" />
              }
            />
          )}

          {step === 4 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t("profile_phone")}>
                <Input inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+20 1X XXX XXXX" />
              </Field>
              <Field label={msg("البريد الإلكتروني", "Email")}>
                <Input type="text" inputMode="email" placeholder="info@yourcompany.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label={msg("الموقع الإلكتروني", "Website")}>
                <Input type="text" inputMode="url" placeholder="yourcompany.com" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </Field>
            </div>
          )}

          {step === 5 && (
            <ReviewStep form={form} gov={gov} locale={locale} onEdit={setStep} />
          )}

          <div className="flex items-center justify-between gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={goBack} disabled={step === 1} className="gap-2">
              <ArrowLeft className="h-4 w-4" />{msg("السابق", "Back")}
            </Button>
            <div className="text-xs text-muted-foreground flex flex-col items-center gap-0.5">
              <span>{msg(`الخطوة ${step} من 5`, `Step ${step} of 5`)}</span>
              {savedAt && !hasExisting && (
                <span className="inline-flex items-center gap-1 text-[10px] text-primary/80">
                  <Check className="h-2.5 w-2.5" />
                  {msg("تم الحفظ تلقائياً", "Autosaved")}
                </span>
              )}
            </div>
            {step < 5 ? (
              <Button type="submit" className="bg-primary hover:bg-primary-hover gap-2">
                {msg("التالي", "Next")}<ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary-hover gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <Check className="h-4 w-4" />
                {hasExisting ? msg("حفظ التغييرات", "Save changes") : msg("إنشاء الشركة", "Create company")}
              </Button>
            )}
          </div>
        </form>

        <div className="mt-4 text-center">
          <Button asChild type="button" variant="ghost" size="sm">
            <Link to="/dashboard">{t("nav_dashboard")}</Link>
          </Button>
        </div>
      </div>
    </Shell>
  );
}

function Stepper({ current, onJump, locale }: { current: StepId; onJump: (id: StepId) => void; locale: "ar" | "en" }) {
  const pct = useMemo(() => ((current - 1) / (STEPS.length - 1)) * 100, [current]);
  return (
    <div>
      <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="absolute inset-y-0 start-0 bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ol className="mt-3 grid grid-cols-5 gap-1">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const done = s.id < current;
          const active = s.id === current;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onJump(s.id)}
                disabled={s.id > current}
                className={[
                  "w-full flex flex-col items-center gap-1 py-1 text-xs transition",
                  active ? "text-primary font-semibold" : done ? "text-foreground hover:text-primary" : "text-muted-foreground cursor-not-allowed",
                ].join(" ")}
              >
                <span className={[
                  "h-7 w-7 rounded-full grid place-items-center border",
                  active ? "border-primary bg-primary text-primary-foreground"
                    : done ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background",
                ].join(" ")}>
                  {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </span>
                <span className="text-[11px] text-center leading-tight">{locale === "ar" ? s.ar : s.en}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ReviewStep({ form, gov, locale, onEdit }:
  { form: Form; gov: string; locale: "ar" | "en"; onEdit: (s: StepId) => void }) {
  const msg = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const name = locale === "ar" ? (form.name_ar || form.name_en) : (form.name_en || form.name_ar);
  const desc = locale === "ar" ? (form.description_ar || form.description_en) : (form.description_en || form.description_ar);
  const industry = INDUSTRIES.find((i) => i.value === form.industry);
  const govLabel = translateEgyptGovernorate(gov, locale) ?? gov;
  const cityLabel = translateEgyptCity(form.city, locale) ?? form.city;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {msg("راجع البيانات قبل الحفظ. يمكنك الرجوع لأي خطوة للتعديل.",
             "Review your details before saving. You can jump back to any step to edit.")}
      </p>

      <div className="rounded-lg border border-border overflow-hidden">
        {form.cover_url && <img src={form.cover_url} alt="" className="w-full h-32 object-cover" />}
        <div className="p-4 flex items-start gap-4">
          {form.logo_url
            ? <img src={form.logo_url} alt="" className="h-16 w-16 rounded-lg object-cover border border-border shrink-0" />
            : <div className="h-16 w-16 rounded-lg bg-muted border border-border grid place-items-center shrink-0"><Building2 className="h-6 w-6 text-muted-foreground" /></div>}
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-lg truncate">{name || msg("(بدون اسم)", "(no name)")}</div>
            {industry && <div className="text-xs text-muted-foreground mt-0.5">{locale === "ar" ? industry.ar : industry.en}</div>}
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="h-3 w-3" />
              <span>{[cityLabel, govLabel].filter(Boolean).join(" · ") || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      <ReviewRow label={msg("الأساسيات", "Basics")} onEdit={() => onEdit(1)}>
        {name || "—"} {industry && <span className="text-muted-foreground">· {locale === "ar" ? industry.ar : industry.en}</span>}
        <div className="text-xs text-muted-foreground">{[cityLabel, govLabel].filter(Boolean).join(" · ") || "—"}</div>
      </ReviewRow>

      <ReviewRow label={msg("الشعار والغلاف", "Logo & Cover")} onEdit={() => onEdit(2)}>
        {form.logo_url || form.cover_url
          ? <span className="text-muted-foreground text-sm">{[form.logo_url && msg("شعار", "Logo"), form.cover_url && msg("غلاف", "Cover")].filter(Boolean).join(" · ")}</span>
          : <span className="text-muted-foreground text-sm">{msg("لم يتم الرفع (اختياري)", "None uploaded (optional)")}</span>}
      </ReviewRow>

      <ReviewRow label={msg("الوصف", "Description")} onEdit={() => onEdit(3)}>
        {desc
          ? <p className="text-sm whitespace-pre-wrap line-clamp-4">{desc}</p>
          : <span className="text-muted-foreground text-sm">{msg("لا يوجد وصف", "No description")}</span>}
      </ReviewRow>

      <ReviewRow label={msg("التواصل", "Contact")} onEdit={() => onEdit(4)}>
        <div className="text-sm space-y-0.5">
          <div>{form.phone || <span className="text-muted-foreground">{msg("لا يوجد هاتف", "No phone")}</span>}</div>
          <div>{form.email || <span className="text-muted-foreground">{msg("لا يوجد بريد", "No email")}</span>}</div>
          <div>{form.website || <span className="text-muted-foreground">{msg("لا يوجد موقع", "No website")}</span>}</div>
        </div>
      </ReviewRow>
    </div>
  );
}

function ReviewRow({ label, onEdit, children }: { label: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-muted-foreground mb-1">{label}</div>
        <div>{children}</div>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onEdit} className="shrink-0">Edit</Button>
    </div>
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
        {url ? <img src={url} alt="" className="h-14 w-14 rounded object-cover border border-border" /> : <div className="h-14 w-14 rounded bg-muted border border-border" />}
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
