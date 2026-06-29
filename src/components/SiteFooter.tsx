import { Link } from "@tanstack/react-router";
import { Briefcase, Mail } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="mt-24 border-t border-border bg-background">
      <div className="container-souqly py-12">
        <div className="grid gap-8 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="premium-panel rounded-3xl p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-gold">
                <Briefcase className="h-4 w-4" />
              </div>
              <span className="text-serif text-2xl text-foreground">{t("brand")}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">{t("footer_tagline")}</p>
            <a href="mailto:support@souqlymarket.com" className="inline-flex items-center gap-2 text-sm text-gold hover:text-gold-soft transition">
              <Mail className="h-4 w-4" />support@souqlymarket.com
            </a>
          </div>
          <FooterCol title="المنصة" links={[
            { to: "/marketplace", label: "السوق" },
            { to: "/wholesale", label: "سوق الجملة" },
            { to: "/factories", label: "المصانع" },
            { to: "/rfq", label: "طلبات الأسعار" },
            { to: "/tenders", label: "المناقصات" },
          ]} />
          <FooterCol title="الشركة" links={[
            { to: "/about", label: "من نحن" },
            { to: "/how-it-works", label: "كيف يعمل سوقلي" },
            { to: "/pricing", label: "الأسعار" },
            { to: "/contact", label: "تواصل معنا" },
            { to: "/faq", label: "الأسئلة الشائعة" },
          ]} />
          <FooterCol title="قانوني" links={[
            { to: "/terms", label: "شروط الاستخدام" },
            { to: "/privacy", label: "سياسة الخصوصية" },
            { to: "/refund-policy", label: "سياسة الاسترداد" },
          ]} />
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-souqly py-4 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} {t("brand")} — جميع الحقوق محفوظة</span>
          <span>صنع في مصر 🇪🇬</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold mb-4 text-gold uppercase tracking-[0.18em]">{title}</h4>
      <ul className="space-y-3 text-sm text-muted-foreground">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="hover:text-gold transition">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
