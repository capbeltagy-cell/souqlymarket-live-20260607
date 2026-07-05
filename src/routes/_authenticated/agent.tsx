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

export const Route = createFileRoute("/_authenticated/agent")({
  head: () => ({ meta: [{ title: "Agent profile — Souqly" }] }),
  component: AgentEdit,
});

type Form = {
  headline_ar: string; headline_en: string;
  bio_ar: string; bio_en: string;
  country: string; city: string;
  specialties: string; languages: string;
};
const empty: Form = {
  headline_ar: "", headline_en: "", bio_ar: "", bio_en: "",
  country: "", city: "", specialties: "", languages: "",
};

function AgentEdit() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const fetchMine = useServerFn(getMyAgent);
  const save = useServerFn(upsertMyAgent);
  const [form, setForm] = useState<Form>(empty);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMine().then((r) => {
      if (r.agent) {
        const a = r.agent;
        setForm({
          headline_ar: a.headline_ar ?? "", headline_en: a.headline_en ?? "",
          bio_ar: a.bio_ar ?? "", bio_en: a.bio_en ?? "",
          country: a.country ?? "", city: a.city ?? "",
          specialties: (a.specialties ?? []).join(", "),
          languages: (a.languages ?? []).join(", "),
        });
      }
    }).finally(() => setLoading(false));
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
          country: form.country || null,
          city: form.city || null,
          specialties: form.specialties.split(",").map((s) => s.trim()).filter(Boolean),
          languages: form.languages.split(",").map((s) => s.trim()).filter(Boolean),
        } as never,
      });
      toast.success(res.created ? t("agent_created") : t("agent_updated"));
      navigate({ to: "/agents/$id", params: { id: res.id } });
    } catch (e) { toast.error((e as Error).message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <Shell><div className="p-10 text-center text-muted-foreground">{t("loading")}</div></Shell>;

  return (
    <Shell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <UserCircle2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("agent_profile")}</h1>
        </div>
        <form onSubmit={onSubmit} className="rounded-lg border border-border bg-card p-6 shadow-card space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t("agent_headline_ar")}>
              <Input dir="rtl" value={form.headline_ar} onChange={(e) => setForm({ ...form, headline_ar: e.target.value })} />
            </Field>
            <Field label={t("agent_headline_en")}>
              <Input value={form.headline_en} onChange={(e) => setForm({ ...form, headline_en: e.target.value })} />
            </Field>
            <Field label={t("field_country")}>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </Field>
            <Field label={t("field_city")}>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label={t("agent_specialties")}>
              <Input placeholder="Real estate, SaaS" value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} />
            </Field>
            <Field label={t("agent_languages")}>
              <Input placeholder="Arabic, English" value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} />
            </Field>
          </div>
          <Field label={t("agent_bio_ar")}>
            <Textarea dir="rtl" rows={4} value={form.bio_ar} onChange={(e) => setForm({ ...form, bio_ar: e.target.value })} />
          </Field>
          <Field label={t("agent_bio_en")}>
            <Textarea rows={4} value={form.bio_en} onChange={(e) => setForm({ ...form, bio_en: e.target.value })} />
          </Field>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
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
