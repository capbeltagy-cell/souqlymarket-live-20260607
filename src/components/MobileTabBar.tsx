import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, PlusCircle, MessageSquare, User as UserIcon } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";

type Tab = { to: string; icon: typeof Home; ar: string; en: string; match: (p: string) => boolean };

export function MobileTabBar() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { user, roles } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPureAgent = roles.includes("agent") && !roles.includes("company") && !roles.includes("admin");

  const centerTab: Tab = isPureAgent
    ? { to: "/campaigns", icon: PlusCircle, ar: "الفرص", en: "Opportunities", match: (p) => p.startsWith("/campaigns") }
    : user
      ? { to: "/listings/new", icon: PlusCircle, ar: "أضف", en: "Post", match: (p) => p.startsWith("/listings/new") }
      : { to: "/auth", icon: PlusCircle, ar: "ابدأ", en: "Start", match: (p) => p.startsWith("/auth") };

  const tabs: Tab[] = [
    { to: "/", icon: Home, ar: "الرئيسية", en: "Home", match: (p) => p === "/" },
    { to: "/search-all", icon: Search, ar: "بحث", en: "Search", match: (p) => p.startsWith("/search") },
    centerTab,
    { to: user ? "/messages" : "/auth", icon: MessageSquare, ar: "الرسائل", en: "Chat", match: (p) => p.startsWith("/messages") },
    { to: user ? "/dashboard" : "/auth", icon: UserIcon, ar: "حسابي", en: "Me", match: (p) => p.startsWith("/dashboard") || p.startsWith("/profile") || p.startsWith("/agent") },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/85"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {tabs.map((t, i) => {
          const active = t.match(pathname);
          const isCenter = i === 2;
          const Icon = t.icon;
          return (
            <li key={`${t.to}-${i}`} className="flex">
              <Link
                to={t.to}
                className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-[11px] font-medium transition ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`grid place-items-center transition ${
                    isCenter
                      ? "h-11 w-11 rounded-2xl bg-primary text-primary-foreground shadow-gold -mt-3"
                      : "h-6 w-6"
                  }`}
                >
                  <Icon className={isCenter ? "h-5 w-5" : "h-5 w-5"} />
                </span>
                <span className="truncate max-w-[64px]">{ar ? t.ar : t.en}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
