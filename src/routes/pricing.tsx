import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Sparkles, ShieldCheck, Info } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";
import {
  getPricingConfig,
  getMyCompanySubscription,
  requestCompanyUpgrade,
} from "@/lib/subscription.functions";
import { createOnlinePayment, getOnlinePaymentStatus } from "@/lib/paymob.functions";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "الأسعار — سوقلي | Souqly Pricing" },
      {
        name: "description",
        content:
          "باقات سوقلي للشركات والمسوقين — أسعار واضحة، تفعيل يدوي بعد الدفع، بدون رسوم مخفية.",
      },
      { property: "og:title", content: "Souqly Pricing" },
      {
        property: "og:description",
        content:
          "Company & Marketer plans on Souqly — transparent pricing, admin-verified activation.",
      },
    ],
  }),
  component: Pricing,
});

function fmt(price: number, locale: string) {
  if (price === 0) return locale === "ar" ? "مجاناً" : "Free";
  return locale === "ar"
    ? `${price.toLocaleString("ar-EG")} جنيه`
    : `EGP ${price.toLocaleString()}`;
}

function Pricing() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { user, roles } = useAuth();
  const fetchCfg = useServerFn(getPricingConfig);
  const fetchSub = useServerFn(getMyCompanySubscription);
  const requestUpgrade = useServerFn(requestCompanyUpgrade);
  const createPayment = useServerFn(createOnlinePayment);
  const fetchPaymentStatus = useServerFn(getOnlinePaymentStatus);

  const [cfg, setCfg] = useState<{
    companyPremiumPriceEgp: number;
    marketerCommissionPct: number;
    freeListingLimit: number;
  } | null>(null);
  const [sub, setSub] = useState<{
    companyId: string | null;
    expiresAt: string | null;
    hasCompany: boolean;
    isPaid: boolean;
    plan: string;
  } | null>(null);
  const [onlineConfigured, setOnlineConfigured] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchCfg()
      .then(setCfg)
      .catch(() => {});
    fetchPaymentStatus()
      .then((result) => setOnlineConfigured(result.configured))
      .catch(() => setOnlineConfigured(false));
    if (user)
      fetchSub()
        .then(setSub)
        .catch(() => setSub(null));
  }, [fetchCfg, fetchPaymentStatus, fetchSub, user]);

  const isPureAgent =
    roles.includes("agent") && !roles.includes("company") && !roles.includes("admin");
  const price = cfg?.companyPremiumPriceEgp ?? 499;
  const pct = cfg?.marketerCommissionPct ?? 15;

  const companyFeatures = ar
    ? [
        "ملف شركة موثّق",
        "منتجات وخدمات غير محدودة",
        "استقبال العملاء المحتملين (Leads)",
        "إنشاء حملات للمسوقين",
        "أداء الحملات والتحليلات",
        "ظهور مميّز في نتائج البحث",
        "دعم أولوية",
      ]
    : [
        "Verified company profile",
        "Unlimited products & services",
        "Receive customer leads",
        "Create marketer campaigns",
        "Campaign analytics & performance",
        "Featured placement in search",
        "Priority support",
      ];

  const freeFeatures = ar
    ? [`حتى ${cfg?.freeListingLimit ?? 5} منتجات`, "استقبال العملاء المحتملين", "لوحة تحكم أساسية"]
    : [`Up to ${cfg?.freeListingLimit ?? 5} products`, "Receive customer leads", "Basic dashboard"];

  const marketerFeatures = ar
    ? [
        "الوصول إلى فرص الربح",
        "روابط تسويق فريدة",
        "تتبع النقرات والتحويلات",
        "محفظة وسحب الأرباح",
        `عمولة إحالة الاشتراكات ${pct}%`,
      ]
    : [
        "Access earning opportunities",
        "Unique tracked referral links",
        "Click & conversion tracking",
        "Wallet & payout withdrawals",
        `${pct}% subscription referral commission`,
      ];

  const onRequestUpgrade = async () => {
    setBusy(true);
    try {
      const r = await requestUpgrade({ data: {} });
      if (r.alreadyPremium)
        toast.success(ar ? "أنت بالفعل مشترك في الباقة المميزة" : "You are already on premium");
      else
        toast.success(
          ar
            ? "تم إرسال طلب التفعيل — سيتواصل معك فريقنا لإتمام الدفع"
            : "Upgrade request sent — our team will contact you to complete payment",
        );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onOnlinePayment = async () => {
    if (!sub?.companyId) return;
    setBusy(true);
    try {
      const result = await createPayment({
        data: {
          companyId: sub.companyId,
          idempotencyKey: crypto.randomUUID(),
          purpose: "company_subscription",
        },
      });
      if (result.alreadyPaid) {
        toast.success(ar ? "الاشتراك مدفوع بالفعل" : "Subscription is already paid");
      } else if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : ar ? "تعذر بدء الدفع" : "Could not start payment",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="bg-surface-2 border-b border-border">
        <div className="container-souqly py-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold">
            {ar ? "الباقات والأسعار" : "Plans & Pricing"}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            {ar
              ? "أسعار واضحة وتجديد يدوي شهري. التفعيل يتم تلقائيًا فقط بعد تأكيد الدفع من بوابة الدفع."
              : "Clear pricing with manual monthly renewal. Activation happens only after the payment gateway verifies payment."}
          </p>
        </div>
      </section>

      <section className="container-souqly py-10 flex-1">
        {/* Honest activation notice */}
        <div className="max-w-5xl mx-auto mb-8 rounded-lg border border-primary/20 bg-primary/5 p-4 flex gap-3 text-sm">
          <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-foreground">
            {onlineConfigured
              ? ar
                ? "الدفع يتم على صفحة Paymob الآمنة، ويُفعّل الاشتراك بعد وصول إشعار دفع صحيح وموقّع. لا نخزن بيانات بطاقتك."
                : "Payment is completed on Paymob's secure page. Activation requires a valid signed webhook. Souqly never stores card details."
              : ar
                ? "واجهة الدفع جاهزة، لكنها غير مفعّلة حتى تُضاف مفاتيح Paymob إلى الخادم. لن يتم تحصيل أي مبلغ الآن."
                : "The payment flow is ready but disabled until Paymob server keys are configured. No money will be collected now."}
          </p>
        </div>

        {isPureAgent ? (
          // Marketer view — one plan, no upgrade CTA (marketers earn, they don't subscribe)
          <div className="max-w-lg mx-auto">
            <div className="rounded-xl border border-primary shadow-elev ring-2 ring-primary/20 bg-card p-8">
              <Badge className="mb-3 bg-primary/10 text-primary hover:bg-primary/10 border-primary/30">
                {ar ? "حساب المسوّق" : "Marketer account"}
              </Badge>
              <h2 className="font-bold text-xl">{ar ? "المسوّق — مجاني" : "Marketer — Free"}</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {ar
                  ? "ابدأ الربح فوراً. لا رسوم اشتراك — تحصل على عمولاتك عبر محفظتك."
                  : "Start earning immediately. No subscription fees — commissions land in your wallet."}
              </p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">{fmt(0, locale)}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {marketerFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full bg-primary hover:bg-primary-hover">
                <Link to="/campaigns">{ar ? "استعرض فرص الربح" : "Browse opportunities"}</Link>
              </Button>
            </div>
          </div>
        ) : (
          // Company / visitor view — Free vs Premium Company
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* FREE */}
            <div className="rounded-xl border border-border shadow-card bg-card p-8 relative">
              {sub && !sub.isPaid && sub.hasCompany && (
                <Badge className="absolute -top-2 end-4 bg-success text-success-foreground hover:bg-success">
                  {ar ? "باقتك الحالية" : "Your plan"}
                </Badge>
              )}
              <h2 className="font-bold text-lg">{ar ? "الباقة المجانية" : "Free"}</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {ar ? "ابدأ بحضور رسمي على سوقلي بدون تكلفة." : "Get on Souqly at no cost."}
              </p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">{fmt(0, locale)}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {!user ? (
                <Button asChild className="w-full" variant="outline">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    {ar ? "أنشئ حسابك" : "Create account"}
                  </Link>
                </Button>
              ) : sub?.hasCompany ? (
                <Button asChild className="w-full" variant="outline">
                  <Link to="/dashboard">{ar ? "لوحة التحكم" : "Dashboard"}</Link>
                </Button>
              ) : (
                <Button asChild className="w-full" variant="outline">
                  <Link to="/company">{ar ? "أنشئ ملف الشركة" : "Create company profile"}</Link>
                </Button>
              )}
            </div>

            {/* PREMIUM COMPANY */}
            <div className="rounded-xl border border-primary shadow-elev ring-2 ring-primary/20 bg-card p-8 relative">
              {sub?.isPaid && (
                <Badge className="absolute -top-2 end-4 bg-success text-success-foreground hover:bg-success">
                  {ar ? "باقتك الحالية" : "Your plan"}
                </Badge>
              )}
              <Badge className="mb-3 bg-primary text-primary-foreground hover:bg-primary">
                {ar ? "الأفضل للشركات" : "Best for businesses"}
              </Badge>
              <h2 className="font-bold text-lg">
                {ar ? "الباقة المميزة للشركات" : "Premium Company"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {ar
                  ? "كل الأدوات لتنمو وتصل لعملاء جدد."
                  : "Everything you need to grow and reach new customers."}
              </p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">{cfg ? fmt(price, locale) : "…"}</span>
                <span className="text-muted-foreground ms-2">{ar ? "/ شهرياً" : "/ month"}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {companyFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {!user ? (
                <Button asChild className="w-full bg-primary hover:bg-primary-hover">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    {ar ? "ابدأ الآن" : "Get started"}
                  </Link>
                </Button>
              ) : !sub?.hasCompany ? (
                <Button asChild className="w-full bg-primary hover:bg-primary-hover">
                  <Link to="/company">
                    {ar ? "أنشئ ملف الشركة أولاً" : "Create company profile first"}
                  </Link>
                </Button>
              ) : sub.isPaid ? (
                <Button className="w-full" variant="outline" disabled>
                  {ar ? "مفعّلة" : "Active"}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button
                    className="w-full gap-2 bg-primary hover:bg-primary-hover"
                    onClick={onOnlinePayment}
                    disabled={busy || !onlineConfigured}
                  >
                    <Sparkles className="h-4 w-4" />
                    {onlineConfigured
                      ? ar
                        ? "ادفع وجدّد شهرًا واحدًا"
                        : "Pay and renew for one month"
                      : ar
                        ? "الدفع الإلكتروني غير مفعّل"
                        : "Online payment is not configured"}
                  </Button>
                  {!onlineConfigured && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={onRequestUpgrade}
                      disabled={busy}
                    >
                      {ar ? "سجّل طلب تجديد يدوي" : "Request manual renewal"}
                    </Button>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                {ar
                  ? sub?.expiresAt
                    ? `تاريخ الانتهاء الحالي: ${new Date(sub.expiresAt).toLocaleDateString("ar-EG")}. لا يوجد تجديد تلقائي.`
                    : "الاشتراك لمدة شهر واحد ولا يتجدد تلقائيًا."
                  : sub?.expiresAt
                    ? `Current expiry: ${new Date(sub.expiresAt).toLocaleDateString("en-GB")}. No automatic renewal.`
                    : "The subscription lasts one month and does not renew automatically."}
              </p>
            </div>
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
