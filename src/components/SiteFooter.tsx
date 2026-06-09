import { Link } from "@tanstack/react-router";
import { Briefcase, Mail } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="container-souqly py-8">
        <div className="grid gap-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="rounded-3xl border border-white/10 bg-surface-2 p-6 shadow-card">
            <div className="flex items-center gap-2 font-bold text-primary mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Briefcase className="h-5 w-5" />
              </div>
              {t("brand")}
            </div>
            <p className="text-sm text-muted-foreground mb-4">{t("footer_tagline")}</p>
            <a href="mailto:support@souqlymarket.com" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition">
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
      <h4 className="text-sm font-semibold mb-3">{title}</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="hover:text-primary transition">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
