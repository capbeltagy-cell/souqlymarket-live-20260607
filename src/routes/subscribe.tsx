import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Crown, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";

export const Route = createFileRoute("/subscribe")({
  head: () => ({
    meta: [
      { title: "اشترك في باقة الشركة — سوقلي" },
      { name: "description", content: "اشترك في باقة الشركة المدفوعة لإضافة إعلانات غير محدودة على سوقلي بسعر 499 جنيه شهرياً." },
    ],
  }),
  component: Subscribe,
});

function Subscribe() {
  const { t, locale } = useI18n();
  const ar = locale === "ar";
  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <section className="container-souqly py-12 flex-1">
        <div className="max-w-2xl mx-auto rounded-2xl border border-primary/30 bg-card p-8 shadow-elev text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 text-primary grid place-items-center mb-4">
            <Crown className="h-7 w-7" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {ar ? "وصلت إلى الحد المجاني (5 إعلانات)" : "You reached the free limit (5 listings)"}
          </h1>
          <p className="text-muted-foreground mt-3">
            {ar
              ? "لإضافة إعلانات غير محدودة، اشترك في باقة الشركة المدفوعة."
              : "To publish unlimited listings, subscribe to the paid company plan."}
          </p>

          <div className="mt-6 rounded-xl border border-border bg-surface-2 p-6">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-5xl font-extrabold text-primary">499</span>
              <span className="text-lg font-semibold">{ar ? "ج.م" : "EGP"}</span>
              <span className="text-muted-foreground">/ {ar ? "شهرياً" : "month"}</span>
            </div>
            <ul className="mt-5 space-y-2 text-start max-w-sm mx-auto">
              {[
                ar ? "إعلانات غير محدودة" : "Unlimited listings",
                ar ? "إعلانات مميزة" : "Featured placements",
                ar ? "تحليلات متقدمة" : "Advanced analytics",
                ar ? "دعم ذو أولوية" : "Priority support",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" /> <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-start">
            <div className="font-semibold mb-1">{ar ? "كيف أشترك؟" : "How to subscribe"}</div>
            <p className="text-muted-foreground">
              {ar
                ? "للاشتراك، يرجى التواصل مع فريق سوقلي عبر واتساب أو البريد الإلكتروني وسيقوم المسؤول بتفعيل الباقة على حسابك."
                : "To subscribe, contact the Souqly team via WhatsApp or email and an admin will activate the plan on your account."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" className="bg-primary hover:bg-primary-hover">
                <a href="https://wa.me/201000000000" target="_blank" rel="noreferrer">WhatsApp</a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href="mailto:billing@souqlymarket.com">billing@souqlymarket.com</a>
              </Button>
            </div>
          </div>

          <div className="mt-6 flex gap-2 justify-center flex-wrap">
            <Button asChild variant="outline">
              <Link to="/dashboard">{t("nav_dashboard")}</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary-hover gap-2">
              <Link to="/pricing"><Sparkles className="h-4 w-4" />{t("section_pricing")}</Link>
            </Button>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
