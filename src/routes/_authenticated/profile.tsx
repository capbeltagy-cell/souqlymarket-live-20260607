import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { User as UserIcon, Loader2, Upload, Building2, UserCircle2 } from "lucide-react";
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

  if (loading)
    return (
      <Shell>
        <div className="p-10 text-center text-muted-foreground">{t("loading")}</div>
      </Shell>
    );

  return (
    <Shell>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <UserIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("profile_title")}</h1>
        </div>

        <form
          onSubmit={save}
          className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card space-y-5"
        >
          {/* Header block: avatar + email + roles */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-5 border-b border-border">
            <div className="relative">
              {form.avatar_url ? (
                <img
                  src={form.avatar_url}
                  alt=""
                  className="h-20 w-20 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-primary text-primary-foreground grid place-items-center text-2xl font-bold">
                  {initial}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                aria-label={msg("تغيير الصورة", "Change avatar")}
                className="absolute -bottom-1 -end-1 h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center shadow hover:bg-primary-hover disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
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
            <div className="flex-1 text-center sm:text-start min-w-0">
              <div className="font-medium truncate">{user?.email}</div>
              <div className="mt-2 flex flex-wrap justify-center sm:justify-start gap-1.5">
                {roles.length === 0 ? (
                  <Badge variant="outline">{msg("مستخدم", "User")}</Badge>
                ) : (
                  roles.map((r) => (
                    <Badge key={r} variant="outline" className="capitalize">
                      {r}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Role-specific quick links */}
          {(isCompany || isAgent) && (
            <div className="grid sm:grid-cols-2 gap-2">
              {isCompany && (
                <Button asChild type="button" variant="outline" className="justify-start gap-2">
                  <Link to="/company">
                    <Building2 className="h-4 w-4" />
                    {msg("ملف الشركة", "Company profile")}
                  </Link>
                </Button>
              )}
              {isAgent && (
                <Button asChild type="button" variant="outline" className="justify-start gap-2">
                  <Link to="/agent">
                    <UserCircle2 className="h-4 w-4" />
                    {msg("ملف المسوق", "Marketer profile")}
                  </Link>
                </Button>
              )}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
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
              <Label>{t("profile_phone")}</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+20 1X XXX XXXX"
                inputMode="tel"
              />
            </div>
            <div className="space-y-2">
              <Label>{msg("اللغة المفضلة", "Preferred language")}</Label>
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

          <div className="space-y-2">
            <Label>{t("profile_bio")}</Label>
            <Textarea
              rows={4}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              dir={ar ? "rtl" : "ltr"}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button asChild type="button" variant="ghost">
              <Link to="/dashboard">{t("nav_dashboard")}</Link>
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-primary hover:bg-primary-hover sm:ms-auto"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t("profile_save")}
            </Button>
          </div>
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
