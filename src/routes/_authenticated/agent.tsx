import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, UserCircle2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/I18nProvider";
import { getMyAgent, upsertMyAgent } from "@/lib/agents.functions";
import { LocationPicker } from "@/components/LocationPicker";
import { BilingualField } from "@/components/BilingualField";
import { SearchableMultiSelect } from "@/components/SearchableMultiSelect";
import { MARKETER_SPECIALTIES, MARKETER_LANGUAGES } from "@/lib/marketer.taxonomy";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/agent")({
  head: () => ({ meta: [{ title: "Agent profile — Souqly" }] }),
  component: AgentEdit,
});

type Form = {
  headline_ar: string;
  headline_en: string;
  bio_ar: string;
  bio_en: string;
  governorate: string;
  city: string;
  specialties: string[];
  languages: string[];
};
const empty: Form = {
  headline_ar: "",
  headline_en: "",
  bio_ar: "",
  bio_en: "",
  governorate: "",
  city: "",
  specialties: [],
  languages: [],
};

function AgentEdit() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const fetchMine = useServerFn(getMyAgent);
  const save = useServerFn(upsertMyAgent);
  const [form, setForm] = useState<Form>(empty);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Company accounts must never be auto-converted to marketer by visiting this page.
  // If they landed here, redirect them safely to their dashboard.
  const { roles, loading: rolesLoading } = useAuth();
  useEffect(() => {
    if (rolesLoading) return;
    const isCompany =
      roles.includes("company") && !roles.includes("agent") && !roles.includes("admin");
    if (isCompany) {
      toast.error(
        locale === "ar"
          ? "هذه الصفحة مخصصة للمسوقين. تم توجيهك إلى لوحة الشركة."
          : "This page is for marketers. Redirecting to your company dashboard.",
      );
      navigate({ to: "/dashboard", replace: true });
    }
  }, [rolesLoading, roles, locale, navigate]);

  useEffect(() => {
    fetchMine()
      .then((r) => {
        if (r.agent) {
          const a = r.agent;
          setForm({
            headline_ar: a.headline_ar ?? "",
            headline_en: a.headline_en ?? "",
            bio_ar: a.bio_ar ?? "",
            bio_en: a.bio_en ?? "",
            governorate: a.country ?? "",
            city: a.city ?? "",
            specialties: (a.specialties ?? []) as string[],
            languages: (a.languages ?? []) as string[],
          });
        }
      })
      .finally(() => setLoading(false));
  }, [fetchMine]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await save({
        data: {
          headline_ar: form.headline_ar || null,
          headline_en: form.headline_en || null,
          bio_ar: form.bio_ar || null,
          bio_en: form.bio_en || null,
          country: form.governorate || null,
          city: form.city || null,
          specialties: form.specialties,
          languages: form.languages,
        } as never,
      });
      toast.success(res.created ? t("agent_created") : t("agent_updated"));
      navigate({ to: "/agents/$id", params: { id: res.id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <Shell>
        <div className="p-10 text-center text-muted-foreground">{t("loading")}</div>
      </Shell>
    );

  return (
    <Shell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <UserCircle2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("agent_profile")}</h1>
        </div>
        <form
          onSubmit={onSubmit}
          className="rounded-lg border border-border bg-card p-6 shadow-card space-y-5"
        >
          <BilingualField
            label={locale === "ar" ? "التخصص المختصر" : "Short headline"}
            hasSecondary={!!(locale === "ar" ? form.headline_en : form.headline_ar)}
            primary={
              locale === "ar" ? (
                <Input
                  dir="rtl"
                  value={form.headline_ar}
                  onChange={(e) => setForm({ ...form, headline_ar: e.target.value })}
                  placeholder="مسوق عقاري في القاهرة"
                />
              ) : (
                <Input
                  value={form.headline_en}
                  onChange={(e) => setForm({ ...form, headline_en: e.target.value })}
                  placeholder="Real estate marketer in Cairo"
                />
              )
            }
            secondary={
              locale === "ar" ? (
                <Input
                  value={form.headline_en}
                  onChange={(e) => setForm({ ...form, headline_en: e.target.value })}
                  placeholder="Headline in English"
                />
              ) : (
                <Input
                  dir="rtl"
                  value={form.headline_ar}
                  onChange={(e) => setForm({ ...form, headline_ar: e.target.value })}
                  placeholder="العنوان بالعربية"
                />
              )
            }
          />

          <LocationPicker
            governorate={form.governorate}
            city={form.city}
            onChange={({ governorate, city }) => setForm({ ...form, governorate, city })}
            labels={{
              governorate: locale === "ar" ? "المحافظة" : "Governorate",
              city: locale === "ar" ? "المدينة" : "City",
            }}
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t("agent_specialties")}>
              <SearchableMultiSelect
                value={form.specialties}
                options={MARKETER_SPECIALTIES}
                onChange={(v) => setForm({ ...form, specialties: v })}
                placeholder={locale === "ar" ? "اختر تخصصاتك" : "Choose your specialties"}
              />
            </Field>
            <Field label={t("agent_languages")}>
              <SearchableMultiSelect
                value={form.languages}
                options={MARKETER_LANGUAGES}
                onChange={(v) => setForm({ ...form, languages: v })}
                placeholder={locale === "ar" ? "اختر اللغات" : "Choose languages"}
              />
            </Field>
          </div>

          <BilingualField
            label={locale === "ar" ? "نبذة عنك" : "Short bio"}
            hasSecondary={!!(locale === "ar" ? form.bio_en : form.bio_ar)}
            primary={
              locale === "ar" ? (
                <Textarea
                  dir="rtl"
                  rows={4}
                  value={form.bio_ar}
                  onChange={(e) => setForm({ ...form, bio_ar: e.target.value })}
                  placeholder="خبرتك، أهم إنجازاتك، وأنواع العملاء الذين تخدمهم"
                />
              ) : (
                <Textarea
                  rows={4}
                  value={form.bio_en}
                  onChange={(e) => setForm({ ...form, bio_en: e.target.value })}
                  placeholder="Your experience, key achievements, and the clients you serve"
                />
              )
            }
            secondary={
              locale === "ar" ? (
                <Textarea
                  rows={3}
                  value={form.bio_en}
                  onChange={(e) => setForm({ ...form, bio_en: e.target.value })}
                  placeholder="Bio in English"
                />
              ) : (
                <Textarea
                  rows={3}
                  dir="rtl"
                  value={form.bio_ar}
                  onChange={(e) => setForm({ ...form, bio_ar: e.target.value })}
                  placeholder="النبذة بالعربية"
                />
              )
            }
          />

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-primary hover:bg-primary-hover"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t("profile_save")}
            </Button>
            <Button asChild type="button" variant="outline">
              <Link to="/dashboard">{t("nav_dashboard")}</Link>
            </Button>
          </div>
        </form>
      </div>
    </Shell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
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
