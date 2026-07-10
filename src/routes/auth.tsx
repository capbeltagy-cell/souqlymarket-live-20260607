import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Briefcase } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/LanguageToggle";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in or create account — Souqly" },
      { name: "description", content: "Sign in to Souqly or create a free account to publish listings, send RFQs, and connect with Egyptian companies, factories and sales agents." },
      { property: "og:title", content: "Sign in to Souqly" },
      { property: "og:description", content: "Access your Souqly B2B account or join free in seconds." },
      { property: "og:url", content: "https://souqlymarket.com/auth" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "https://souqlymarket.com/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { dir } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const ar = dir === "rtl";

  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [signupRole, setSignupRole] = useState<"company" | "agent">("company");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (password.length < 6) {
        throw new Error(ar ? "كلمة المرور 6 أحرف على الأقل" : "Password must be at least 6 characters");
      }
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: email.split("@")[0], role: signupRole } },
        });
        if (error) throw error;
        try { localStorage.setItem("souqly:role_choice", signupRole); } catch {}
        toast.success(ar ? "تم إنشاء الحساب" : "Account created");
        // Send user straight to the right onboarding surface for their chosen role.
        navigate({ to: signupRole === "company" ? "/company" : "/agent" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(ar ? "أهلاً بعودتك" : "Welcome back");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex hero-gradient text-primary-foreground p-12 flex-col justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/15">
            <Briefcase className="h-5 w-5" />
          </div>
          Souqly
        </Link>
        <div>
          <h2 className="text-4xl font-bold leading-tight mb-4">{ar ? "انضم إلى أكبر سوق B2B في مصر" : "Join Egypt's leading B2B marketplace"}</h2>
          <p className="text-primary-foreground/80">{ar ? "تسجيل سريع. بدون نماذج طويلة." : "Fast signup. No long forms."}</p>
        </div>
        <div className="text-sm text-primary-foreground/60">© {new Date().getFullYear()} Souqly</div>
      </div>

      <div className="flex flex-col p-6 lg:p-12">
        <div className="flex justify-between items-center mb-6">
          <Link to="/" className="flex items-center gap-2 font-bold text-primary lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><Briefcase className="h-5 w-5" /></div>
            Souqly
          </Link>
          <div className="ml-auto"><LanguageToggle /></div>
        </div>

        <div className="flex-1 grid place-items-center">
          <div className="w-full max-w-md">
            <h1 className="text-2xl font-bold mb-1">
              {mode === "signup" ? (ar ? "إنشاء حساب" : "Create account") : (ar ? "تسجيل الدخول" : "Sign in")}
            </h1>
            <p className="text-muted-foreground text-sm mb-6">
              {mode === "signup" ? (ar ? "أدخل بريدك وكلمة المرور" : "Enter your email and password") : (ar ? "مرحباً بعودتك" : "Welcome back")}
            </p>


            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">{ar ? "البريد الإلكتروني" : "Email"}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{ar ? "كلمة المرور" : "Password"}</Label>
                  {mode === "signin" && (
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">{ar ? "نسيت كلمة المرور؟" : "Forgot?"}</Link>
                  )}
                </div>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1.5" />
                <p className="text-xs text-muted-foreground mt-1">{ar ? "6 أحرف على الأقل" : "Minimum 6 characters"}</p>
              </div>
              <Button type="submit" disabled={busy} className="w-full h-11">
                {busy ? (ar ? "جارٍ..." : "Working...") : mode === "signup" ? (ar ? "إنشاء حساب" : "Create account") : (ar ? "دخول" : "Sign in")}
              </Button>
            </form>

            <p className="text-sm text-center text-muted-foreground mt-6">
              {mode === "signup"
                ? (ar ? "لديك حساب؟ " : "Already have an account? ")
                : (ar ? "ليس لديك حساب؟ " : "Don't have an account? ")}
              <button
                type="button"
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                className="text-primary hover:underline font-medium"
              >
                {mode === "signup" ? (ar ? "دخول" : "Sign in") : (ar ? "إنشاء حساب" : "Sign up")}
              </button>
            </p>

            <p className="text-xs text-muted-foreground text-center pt-4">
              {ar ? "بالمتابعة، فإنك توافق على" : "By continuing, you agree to our"}{" "}
              <Link to="/terms" className="underline">{ar ? "الشروط" : "Terms"}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
