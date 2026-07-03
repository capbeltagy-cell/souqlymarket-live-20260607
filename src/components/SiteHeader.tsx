import { Link } from "@tanstack/react-router";
import { Briefcase, LogOut, LayoutDashboard, PlusCircle, User as UserIcon, DollarSign, Link2, ShieldCheck, Building2, UserCircle2, Heart, ListChecks, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "./LanguageToggle";
import { GlobalSearch } from "./GlobalSearch";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const { t } = useI18n();
  const { user, roles, signOut } = useAuth();
  const isAdmin = roles.includes("admin");


  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="container-souqly flex h-16 items-center gap-4">
        <Link to="/" className="flex items-center gap-3 font-bold text-lg shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-gold">
            <Briefcase className="h-4 w-4" />
          </div>
          <span className="text-serif text-2xl text-foreground tracking-tight">{t("brand")}</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-3 py-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition">
                {t("nav_marketplace")}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem asChild><Link to="/marketplace">كل السوق</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/real-estate">عقارات</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/lands">أراضي</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/factories">المصانع</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/wholesale">سوق الجملة</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/agents">المسوقين</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-3 py-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition">
                فرص أعمال
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem asChild><Link to="/rfq">طلبات الأسعار</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/tenders">المناقصات</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link to="/companies" className="px-3 py-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition">{t("nav_companies")}</Link>
          <Link to="/pricing" className="px-3 py-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition">{t("nav_pricing")}</Link>
          <Link to="/how-it-works" className="px-3 py-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition">كيف يعمل</Link>
        </nav>


        <div className="ms-auto flex items-center gap-2">
          <div className="hidden xl:block w-[260px]">
            <GlobalSearch compact />
          </div>

          <LanguageToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2" aria-label="Account menu">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {(user.email ?? "?")[0]?.toUpperCase()}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="gap-2"><LayoutDashboard className="h-4 w-4" />{t("nav_dashboard")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="gap-2"><UserIcon className="h-4 w-4" />{t("nav_profile")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/company" className="gap-2"><Building2 className="h-4 w-4" />{t("nav_company_profile")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/agent" className="gap-2"><UserCircle2 className="h-4 w-4" />{t("nav_agent_profile")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/listings/new" className="gap-2"><PlusCircle className="h-4 w-4" />{t("nav_new_listing")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/favorites" className="gap-2"><Heart className="h-4 w-4" />{t("nav_favorites")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/commissions" className="gap-2"><DollarSign className="h-4 w-4" />{t("nav_commissions")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/referral-program" className="gap-2"><Link2 className="h-4 w-4" />برنامج الإحالات</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/rfq/mine" className="gap-2"><ListChecks className="h-4 w-4" />طلباتي للأسعار</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/tenders/mine" className="gap-2"><ListChecks className="h-4 w-4" />مناقصاتي</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/company-profile-extra" className="gap-2"><Building2 className="h-4 w-4" />تخصيص ملف الشركة</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/verification" className="gap-2"><ShieldCheck className="h-4 w-4" />{t("nav_verification")}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/moderation" className="gap-2"><ListChecks className="h-4 w-4" />{t("nav_moderation")}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin-overview" className="gap-2"><ShieldCheck className="h-4 w-4" />نظرة عامة للإدارة</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/seed" className="gap-2"><Sprout className="h-4 w-4" />{t("seed_title")}</Link>
                    </DropdownMenuItem>
                  </>
                )}



                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="gap-2 text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />{t("nav_signout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/auth">{t("nav_signin")}</Link></Button>
              <Button asChild size="sm" className="bg-primary hover:bg-primary-hover">
                <Link to="/auth" search={{ mode: "signup" }}>{t("nav_signup")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
