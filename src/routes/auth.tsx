import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Briefcase, Mail, Phone, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/LanguageToggle";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — Souqly" }] }),
  component: AuthPage,
});

type Step = "choose" | "email" | "phone" | "otp";
type Method = "email" | "phone";

function AuthPage() {
  const { dir } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const ar = dir === "rtl";

  const [step, setStep] = useState<Step>("choose");
  const [method, setMethod] = useState<Method>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState<"company" | "agent" | "buyer">("buyer");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  function normalizePhone(p: string) {
    const trimmed = p.trim().replace(/\s|-/g, "");
    if (trimmed.startsWith("+")) return trimmed;
    if (trimmed.startsWith("00")) return "+" + trimmed.slice(2);
    if (trimmed.startsWith("0")) return "+20" + trimmed.slice(1);
    return "+" + trimmed;
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth/callback`,
      });
      if (result.error) throw result.error;
      if (!result.redirected) {
        // Tokens set; navigate to dashboard
        navigate({ to: "/dashboard" });
      }
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // Try sign in first; if it fails, sign up.
      const signIn = await supabase.auth.signInWithPassword({ email, password });
      if (signIn.error) {
        if (password.length < 6) throw new Error(ar ? "كلمة المرور 6 أحرف على الأقل" : "Password must be at least 6 characters");
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { role, display_name: email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success(ar ? "تم إنشاء الحساب! تحقق من بريدك للتفعيل." : "Account created! Check your inbox to confirm.");
      } else {
        toast.success(ar ? "أهلاً بعودتك" : "Welcome back");
      }
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const p = normalizePhone(phone);
      const { error } = await supabase.auth.signInWithOtp({
        phone: p,
        options: { data: { role } },
      });
      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("phone provider") || msg.includes("provider") || (error as { code?: string }).code === "phone_provider_disabled") {
          toast.error(ar
            ? "تسجيل الدخول بالجوال غير متاح حالياً. الرجاء استخدام البريد الإلكتروني أو جوجل."
            : "Phone login is not available yet. Please use Email or Google to continue.");
          setStep("choose");
          return;
        }
        throw error;
      }
      setPhone(p);
      setStep("otp");
      toast.success(ar ? "تم إرسال الرمز" : "OTP sent");
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
      if (error) throw error;
      toast.success(ar ? "تم التسجيل" : "Signed in");
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
            {step !== "choose" && (
              <button onClick={() => setStep(step === "otp" ? "phone" : "choose")} className="text-sm text-muted-foreground mb-4 inline-flex items-center gap-1 hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> {ar ? "رجوع" : "Back"}
              </button>
            )}

            <h1 className="text-2xl font-bold mb-1">{ar ? "مرحباً بك" : "Welcome"}</h1>
            <p className="text-muted-foreground text-sm mb-6">{ar ? "اختر طريقة الدخول" : "Choose how to continue"}</p>

            {/* Role selector — always visible, applied to whichever method */}
            <div className="mb-5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{ar ? "نوع الحساب" : "Account type"}</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {([
                  { v: "buyer", l: ar ? "مشتري" : "Buyer" },
                  { v: "company", l: ar ? "شركة" : "Company" },
                  { v: "agent", l: ar ? "وكيل" : "Agent" },
                ] as const).map((o) => (
                  <button type="button" key={o.v} onClick={() => setRole(o.v)}
                    className={`rounded-md border p-2 text-sm transition ${role === o.v ? "border-primary bg-primary/5 text-primary font-medium" : "border-border hover:border-primary/30"}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            {step === "choose" && (
              <div className="space-y-3">
                <Button onClick={handleGoogle} disabled={busy} variant="outline" className="w-full gap-2 h-11">
                  <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
                  {ar ? "متابعة مع جوجل" : "Continue with Google"}
                </Button>
                <Button onClick={() => { setMethod("phone"); setStep("phone"); }} variant="outline" className="w-full gap-2 h-11">
                  <Phone className="h-4 w-4" /> {ar ? "متابعة برقم الجوال" : "Continue with Mobile"}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center -mt-1">{ar ? "قد يكون تسجيل الدخول بالجوال غير متاح" : "Mobile login may be unavailable"}</p>
                <Button onClick={() => { setMethod("email"); setStep("email"); }} variant="outline" className="w-full gap-2 h-11">
                  <Mail className="h-4 w-4" /> {ar ? "متابعة بالبريد" : "Continue with Email"}
                </Button>
                <p className="text-xs text-muted-foreground text-center pt-2">
                  {ar ? "بالمتابعة، فإنك توافق على" : "By continuing, you agree to our"}{" "}
                  <Link to="/terms" className="underline">{ar ? "الشروط" : "Terms"}</Link>
                </p>
              </div>
            )}

            {step === "email" && (
              <form onSubmit={handleEmail} className="space-y-4">
                <div>
                  <Label htmlFor="email">{ar ? "البريد الإلكتروني" : "Email"}</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{ar ? "كلمة المرور" : "Password"}</Label>
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">{ar ? "نسيت كلمة المرور؟" : "Forgot?"}</Link>
                  </div>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1.5" />
                  <p className="text-xs text-muted-foreground mt-1">{ar ? "6 أحرف على الأقل" : "Minimum 6 characters"}</p>
                </div>
                <Button type="submit" disabled={busy} className="w-full h-11">
                  {ar ? "متابعة" : "Continue"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">{ar ? "سيتم تسجيل دخولك أو إنشاء حساب جديد تلقائياً." : "We'll sign you in or create an account automatically."}</p>
              </form>
            )}

            {step === "phone" && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <Label htmlFor="phone">{ar ? "رقم الجوال" : "Mobile number"}</Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="mt-1.5" placeholder="01xxxxxxxxx" dir="ltr" />
                  <p className="text-xs text-muted-foreground mt-1">{ar ? "أرقام مصرية تبدأ بـ 01 — سنرسل رمز تحقق" : "Egyptian numbers starting with 01 — we'll send a verification code"}</p>
                </div>
                <Button type="submit" disabled={busy} className="w-full h-11">
                  {ar ? "إرسال الرمز" : "Send OTP"}
                </Button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <Label htmlFor="otp">{ar ? "أدخل الرمز" : "Enter OTP"}</Label>
                  <Input id="otp" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value)} required className="mt-1.5 text-center tracking-[0.5em] text-lg" dir="ltr" maxLength={6} />
                  <p className="text-xs text-muted-foreground mt-1">{ar ? "أرسلنا رمزاً إلى" : "Sent to"} {phone}</p>
                </div>
                <Button type="submit" disabled={busy} className="w-full h-11">
                  {ar ? "تحقق ودخول" : "Verify & Continue"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
