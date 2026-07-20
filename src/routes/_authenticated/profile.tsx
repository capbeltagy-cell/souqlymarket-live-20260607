import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  User as UserIcon,
  Loader2,
  Camera,
  Building2,
  UserCircle2,
  Mail,
  Phone,
  Languages,
  ShieldCheck,
  Save,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Souqly" }] }),
  component: ProfilePage,
});

type Form = {
  full_name: string;
  display_name: string;
  phone: string;
  bio: string;
  avatar_url: string;
  preferred_language: string;
};
const empty: Form = {
  full_name: "",
  display_name: "",
  phone: "",
  bio: "",
  avatar_url: "",
  preferred_language: "ar",
};

const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function ProfilePage() {
  const { t, locale } = useI18n();
  const { user, roles } = useAuth();
  const [form, setForm] = useState<Form>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const ar = locale === "ar";
  const msg = (a: string, e: string) => (ar ? a : e);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, display_name, phone, bio, avatar_url, preferred_language")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            full_name: data.full_name ?? "",
            display_name: data.display_name ?? "",
            phone: data.phone ?? "",
            bio: data.bio ?? "",
            avatar_url: data.avatar_url ?? "",
            preferred_language: data.preferred_language ?? "ar",
          });
        }
        setLoading(false);
      });
  }, [user]);

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      toast.error(msg("استخدم صورة JPG أو PNG أو WebP", "Use a JPG, PNG, or WebP image"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(msg("الحد الأقصى 5 ميجا", "Max size is 5MB"));
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data, error: sErr } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !data?.signedUrl) throw sErr ?? new Error("Sign URL failed");
      setForm((f) => ({ ...f, avatar_url: data.signedUrl }));
      toast.success(msg("تم رفع الصورة", "Avatar uploaded"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    // Explicit id ensures RLS `auth.uid() = id` passes; only own row is writeable.
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: form.full_name || null,
      display_name: form.display_name || null,
      phone: form.phone || null,
      bio: form.bio || null,
      avatar_url: form.avatar_url || null,
      preferred_language: form.preferred_language || "ar",
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success(t("profile_updated"));
  };

  const initial = (form.display_name || form.full_name || user?.email || "?")[0]?.toUpperCase();
  const isCompany = roles.includes("company");
  const isAgent = roles.includes("agent");
  const completedFields = [
    form.full_name,
    form.display_name,
    form.phone,
    form.bio,
    form.avatar_url,
  ].filter((value) => value.trim()).length;
  const completion = Math.round((completedFields / 5) * 100);
  const BackIcon = ar ? ArrowRight : ArrowLeft;

  if (loading)
    return (
      <Shell>
        <div className="p-10 text-center text-muted-foreground">{t("loading")}</div>
      </Shell>
    );

  return (
    <Shell>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <UserIcon className="h-4 w-4" />
              {msg("حسابك على سوقلي", "Your Souqly account")}
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("profile_title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {msg(
                "حدّث بياناتك وطريقة ظهورك في المنصة.",
                "Keep your details and public identity up to date.",
              )}
            </p>
          </div>
          <Button asChild type="button" variant="ghost" className="hidden sm:inline-flex">
            <Link to="/dashboard">
              <BackIcon className="me-2 h-4 w-4" />
              {t("nav_dashboard")}
            </Link>
          </Button>
        </div>

        <form onSubmit={save} className="grid items-start gap-5 lg:grid-cols-[19rem_1fr]">
          <aside className="overflow-hidden rounded-2xl border border-border bg-card shadow-card lg:sticky lg:top-24">
            <div className="h-24 bg-gradient-to-br from-primary via-primary/85 to-primary/55" />
            <div className="px-5 pb-5">
              <div className="relative -mt-11 mb-3 w-fit">
                {form.avatar_url ? (
                  <img
                    src={form.avatar_url}
                    alt={
                      form.display_name || form.full_name || msg("صورة الحساب", "Profile avatar")
                    }
                    className="h-24 w-24 rounded-2xl border-4 border-card bg-card object-cover shadow-md"
                  />
                ) : (
                  <div className="grid h-24 w-24 place-items-center rounded-2xl border-4 border-card bg-primary text-3xl font-bold text-primary-foreground shadow-md">
                    {initial}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  aria-label={msg("تغيير الصورة", "Change avatar")}
                  className="absolute -bottom-1 -end-1 grid h-9 w-9 place-items-center rounded-xl border-2 border-card bg-primary text-primary-foreground shadow transition hover:bg-primary-hover disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadAvatar(f);
                    e.target.value = "";
                  }}
                />
              </div>
              <h2 className="truncate text-lg font-bold">
                {form.display_name || form.full_name || msg("مستخدم سوقلي", "Souqly user")}
              </h2>
              <div className="mt-1 flex items-center gap-2 truncate text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate" dir="ltr">
                  {user?.email}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {roles.length === 0 ? (
                  <Badge variant="secondary">{msg("مستخدم", "User")}</Badge>
                ) : (
                  roles.map((r) => (
                    <Badge key={r} variant="secondary" className="capitalize">
                      {r}
                    </Badge>
                  ))
                )}
              </div>
              <div className="mt-5 rounded-xl bg-muted/60 p-3">
                <div className="mb-2 flex items-center justify-between text-xs font-medium">
                  <span>{msg("اكتمال الملف", "Profile completion")}</span>
                  <span className="text-primary">{completion}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>
              {(isCompany || isAgent) && (
                <div className="mt-4 space-y-2">
                  {isCompany && (
                    <Button
                      asChild
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-2"
                    >
                      <Link to="/company">
                        <Building2 className="h-4 w-4" />
                        {msg("ملف الشركة", "Company profile")}
                      </Link>
                    </Button>
                  )}
                  {isAgent && (
                    <Button
                      asChild
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-2"
                    >
                      <Link to="/agent">
                        <UserCircle2 className="h-4 w-4" />
                        {msg("ملف المسوق", "Marketer profile")}
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </aside>

          <section className="space-y-6 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
            <div className="flex items-start gap-3 border-b border-border pb-5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold">{msg("المعلومات الأساسية", "Basic information")}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {msg(
                    "هذه البيانات تساعدنا في تخصيص تجربتك.",
                    "These details help personalize your experience.",
                  )}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("profile_full_name")}</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  dir={ar ? "rtl" : "ltr"}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("profile_display_name")}</Label>
                <Input
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  placeholder={form.full_name}
                  dir={ar ? "rtl" : "ltr"}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {t("profile_phone")}
                </Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+20 1X XXX XXXX"
                  inputMode="tel"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Languages className="h-4 w-4 text-muted-foreground" />
                  {msg("اللغة المفضلة", "Preferred language")}
                </Label>
                <select
                  value={form.preferred_language}
                  onChange={(e) => setForm({ ...form, preferred_language: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-5">
              <div className="flex items-center justify-between gap-3">
                <Label>{t("profile_bio")}</Label>
                <span className="text-xs text-muted-foreground">{form.bio.length}/500</span>
              </div>
              <Textarea
                rows={5}
                maxLength={500}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                dir={ar ? "rtl" : "ltr"}
                placeholder={msg(
                  "اكتب نبذة قصيرة عنك واهتماماتك...",
                  "Share a short introduction about you...",
                )}
                className="resize-none"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row">
              <Button asChild type="button" variant="ghost">
                <Link to="/dashboard">
                  <BackIcon className="me-2 h-4 w-4" />
                  {t("nav_dashboard")}
                </Link>
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary-hover sm:ms-auto"
              >
                {saving ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="me-2 h-4 w-4" />
                )}
                {t("profile_save")}
              </Button>
            </div>
          </section>
        </form>
      </div>
    </Shell>
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
