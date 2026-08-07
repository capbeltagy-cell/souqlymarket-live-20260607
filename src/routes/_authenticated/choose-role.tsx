import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase, ShoppingBag, Users, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { chooseMyRole } from "@/lib/onboarding.functions";

export const Route = createFileRoute("/_authenticated/choose-role")({
  head: () => ({
    meta: [{ title: "Choose your role — Souqly" }, { name: "robots", content: "noindex,follow" }],
  }),
  component: ChooseRolePage,
});

type Choice = "company" | "agent" | "customer";

function ChooseRolePage() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [busy, setBusy] = useState<Choice | null>(null);
  const assign = useServerFn(chooseMyRole);

  // If user already has a role, don't linger here — send them to their dashboard.
  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (roles.includes("admin") || roles.includes("company") || roles.includes("agent")) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, user, roles, navigate]);

  async function pick(choice: Choice) {
    if (busy) return;
    setBusy(choice);
    try {
      if (choice === "customer") {
        try {
          localStorage.setItem("souqly:role_choice", "customer");
        } catch {
          // Storage may be unavailable in privacy mode; navigation can continue.
        }
        toast.success(ar ? "استكشف السوق" : "Explore the marketplace");
        navigate({ to: "/marketplace" });
        return;
      }
      await assign({ data: { role: choice } });
      try {
        localStorage.setItem("souqly:role_choice", choice);
      } catch {
        // Storage may be unavailable in privacy mode; role assignment already succeeded.
      }
      toast.success(ar ? "تم اختيار الدور" : "Role selected");
      navigate({ to: choice === "company" ? "/company" : "/agent" });
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-10 flex-1">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">
              {ar ? "كيف تريد استخدام سوقلي؟" : "How will you use Souqly?"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {ar
                ? "اختر دورك للمتابعة. يمكنك دائماً إضافة أدوار أخرى لاحقاً."
                : "Pick your role to continue. You can add other roles later."}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <RoleCard
              icon={Briefcase}
              title={ar ? "شركة / مصنع / تاجر" : "Company / Factory / Trader"}
              body={
                ar
                  ? "انشر منتجاتك واستقبل الطلبات وأدر مبيعاتك."
                  : "Publish listings, receive leads, manage sales."
              }
              cta={ar ? "أنشئ ملف الشركة" : "Create company profile"}
              onClick={() => pick("company")}
              loading={busy === "company"}
              disabled={!!busy}
              highlights={[
                ar ? "قوائم منتجات وخدمات" : "Product & service listings",
                ar ? "استقبال طلبات العروض" : "Receive RFQs & leads",
                ar ? "لوحة تحكم مبيعات" : "Sales dashboard",
              ]}
              ar={ar}
            />
            <RoleCard
              icon={Users}
              title={ar ? "مسوّق / وسيط" : "Marketer / Agent"}
              body={
                ar
                  ? "اربح عمولات من الإحالات والصفقات."
                  : "Earn commissions from referrals and closed deals."
              }
              cta={ar ? "أنشئ ملف المسوّق" : "Create marketer profile"}
              onClick={() => pick("agent")}
              loading={busy === "agent"}
              disabled={!!busy}
              highlights={[
                ar ? "روابط إحالة مخصصة" : "Custom referral links",
                ar ? "لوحة عمولات وأرباح" : "Commission dashboard",
                ar ? "حملات نشطة" : "Live campaigns",
              ]}
              ar={ar}
            />
            <RoleCard
              icon={ShoppingBag}
              title={ar ? "مشتري / عميل" : "Buyer / Customer"}
              body={
                ar
                  ? "تصفح السوق وأرسل طلبات عروض للموردين."
                  : "Browse the marketplace and request quotes."
              }
              cta={ar ? "ابدأ التسوق" : "Start browsing"}
              onClick={() => pick("customer")}
              loading={busy === "customer"}
              disabled={!!busy}
              highlights={[
                ar ? "تصفح آلاف الإعلانات" : "Browse thousands of listings",
                ar ? "طلبات عروض أسعار" : "Send RFQs",
                ar ? "محادثة مع الموردين" : "Chat with suppliers",
              ]}
              ar={ar}
            />
          </div>

          <p className="text-xs text-center text-muted-foreground mt-8">
            {ar ? "غير متأكد؟ " : "Not sure? "}
            <Link to="/marketplace" className="underline hover:text-foreground">
              {ar ? "تصفّح السوق أولاً" : "Browse the marketplace first"}
            </Link>
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function RoleCard({
  icon: Icon,
  title,
  body,
  cta,
  onClick,
  loading,
  disabled,
  highlights,
  ar,
}: {
  icon: typeof Briefcase;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  highlights: string[];
  ar: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-start rounded-2xl border border-white/10 bg-surface p-6 shadow-elev transition hover:border-primary/40 hover:shadow-card focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center mb-4">
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-semibold text-lg">{title}</div>
      <div className="text-sm text-muted-foreground mt-1">{body}</div>
      <ul className="mt-4 space-y-1.5">
        {highlights.map((h) => (
          <li key={h} className="text-xs flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" /> {h}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-center justify-between text-sm font-medium text-primary">
        <span>{cta}</span>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight className={`h-4 w-4 ${ar ? "rotate-180" : ""}`} />
        )}
      </div>
    </button>
  );
}
