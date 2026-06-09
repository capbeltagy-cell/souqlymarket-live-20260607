import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Briefcase } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LanguageToggle } from "@/components/LanguageToggle";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — Souqly" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"company" | "agent">("company");
  const [busy, setBusy] = useState(false);
  const { t, dir } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { full_name: fullName, display_name: displayName || fullName, phone, role },
          },
        });
        if (error) throw error;
        toast.success(dir === "rtl" ? "تم إنشاء الحساب! تحقق من بريدك." : "Account created! Check your email.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(dir === "rtl" ? "أهلاً بعودتك" : "Welcome back");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) toast.error(error.message);
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex hero-gradient text-primary-foreground p-12 flex-col justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/15">
            <Briefcase className="h-5 w-5" />
          </div>
          {t("brand")}
        </Link>
        <div>
          <h2 className="text-4xl font-bold leading-tight mb-4">{t("hero_title")}</h2>
          <p className="text-primary-foreground/80">{t("hero_subtitle")}</p>
        </div>
        <div className="text-sm text-primary-foreground/60">© {new Date().getFullYear()} {t("brand")}</div>
      </div>

      <div className="flex flex-col p-6 lg:p-12">
        <div className="flex justify-between items-center lg:hidden mb-6">
          <Link to="/" className="flex items-center gap-2 font-bold text-primary">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><Briefcase className="h-5 w-5" /></div>
            {t("brand")}
          </Link>
          <LanguageToggle />
        </div>
        <div className="hidden lg:flex justify-end mb-4"><LanguageToggle /></div>

        <div className="flex-1 grid place-items-center">
          <div className="w-full max-w-md">
            <h1 className="text-2xl font-bold mb-1">{t("auth_welcome")}</h1>
            <p className="text-muted-foreground text-sm mb-6">
              {mode === "signin" ? t("auth_signin") : t("auth_signup")}
            </p>

            <Button onClick={handleGoogle} disabled={busy} variant="outline" className="w-full mb-4 gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
              {t("auth_continue_google")}
            </Button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">{t("or")}</span></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <div>
                    <Label htmlFor="name">{t("auth_full_name")}</Label>
                    <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="display">{t("auth_display_name")}</Label>
                    <Input id="display" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5" placeholder={fullName || ""} />
                  </div>
                  <div>
                    <Label htmlFor="phone">{t("auth_phone")}</Label>
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" placeholder={t("auth_phone_hint")} />
                  </div>
                  <div>
                    <Label>{t("auth_role")}</Label>
                    <RadioGroup value={role} onValueChange={(v) => setRole(v as "company" | "agent")} className="grid grid-cols-2 gap-2 mt-1.5">
                      <label className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer ${role === "company" ? "border-primary bg-primary/5" : "border-border"}`}>
                        <RadioGroupItem value="company" /><span className="text-sm">{t("auth_role_company")}</span>
                      </label>
                      <label className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer ${role === "agent" ? "border-primary bg-primary/5" : "border-border"}`}>
                        <RadioGroupItem value="agent" /><span className="text-sm">{t("auth_role_agent")}</span>
                      </label>
                    </RadioGroup>
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="email">{t("auth_email")}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t("auth_password")}</Label>
                  {mode === "signin" && (
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">{t("forgot_link")}</Link>
                  )}
                </div>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1.5" />
              </div>
              <Button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary-hover">
                {mode === "signin" ? t("auth_signin") : t("auth_signup")}
              </Button>
            </form>

            <p className="text-sm text-muted-foreground mt-6 text-center">
              {mode === "signin" ? t("auth_no_account") : t("auth_have_account")}{" "}
              <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary font-medium hover:underline">
                {mode === "signin" ? t("auth_signup") : t("auth_signin")}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
