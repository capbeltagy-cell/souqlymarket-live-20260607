import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Briefcase,
  BriefcaseBusiness,
  LogOut,
  LayoutDashboard,
  PlusCircle,
  User as UserIcon,
  DollarSign,
  Link2,
  ShieldCheck,
  Building2,
  UserCircle2,
  Heart,
  ListChecks,
  MessageSquare,
  ShoppingBag,
  ChevronRight,
  ShoppingCart,
  Menu,
  Store,
  Home,
} from "lucide-react";
import { cartCount, subscribeCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "./LanguageToggle";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationBell } from "./NotificationBell";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const { t } = useI18n();
  const { user, roles, signOut } = useAuth();
  const isAdmin = roles.includes("admin");
  const isCompany = roles.includes("company");
  const isAgent = roles.includes("agent");
  const isPureAgent = isAgent && !isCompany && !isAdmin;
  const handleSignOut = async () => {
    await signOut();
    window.location.assign("/");
  };

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="container-souqly flex h-14 lg:h-16 items-center gap-2 lg:gap-4">
        <Link
          to="/"
          className="group flex items-center gap-2 lg:gap-3 font-bold text-lg shrink-0"
          aria-label="سوقلي — الرئيسية"
        >
          <div className="relative flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-gold transition-transform group-hover:-translate-y-0.5">
            <BriefcaseBusiness className="h-4 w-4 lg:h-5 lg:w-5" />
            <span className="absolute -end-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-success" />
          </div>
          <span className="leading-none">
            <span className="block text-serif text-xl lg:text-2xl text-foreground tracking-tight">
              {t("brand")}
            </span>
            <span className="hidden lg:block mt-1 text-[9px] font-semibold tracking-[0.16em] text-muted-foreground">
              سوق الأعمال المصري
            </span>
          </span>
        </Link>

        <nav
          className="hidden lg:flex items-center gap-1 text-sm font-medium"
          aria-label="التنقل الرئيسي"
        >
          <PrimaryLink to="/" label="الرئيسية" />
          <PrimaryLink to="/marketplace" label={t("nav_marketplace")} />
          <PrimaryLink to="/stores" label="المتاجر" />
          <PrimaryLink to="/companies" label={t("nav_companies")} />
          <PrimaryLink to="/rfq" label="طلبات الأسعار" />
          <PrimaryLink to="/store/open" label="افتح متجرك" emphasis />
        </nav>

        <div className="ms-auto flex items-center gap-1.5 lg:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="فتح القائمة">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <MobilePrimaryLink to="/" icon={<Home />} label="الرئيسية" />
              <MobilePrimaryLink to="/marketplace" icon={<ShoppingBag />} label="السوق" />
              <MobilePrimaryLink to="/stores" icon={<Store />} label="المتاجر" />
              <MobilePrimaryLink to="/companies" icon={<Building2 />} label="الشركات" />
              <MobilePrimaryLink to="/rfq" icon={<ListChecks />} label="طلبات الأسعار" />
              <DropdownMenuSeparator />
              <MobilePrimaryLink to="/store/open" icon={<PlusCircle />} label="افتح متجرك" />
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="hidden xl:block w-[260px]">
            <GlobalSearch compact />
          </div>

          <LanguageToggle />
          <CartButton />
          <NotificationBell />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2" aria-label="Account menu">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {(user.email ?? "?")[0]?.toUpperCase()}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="max-h-[min(80vh,36rem)] w-64 overflow-y-auto"
              >
                <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* Essentials — always visible */}
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    {t("nav_dashboard")}
                  </Link>
                </DropdownMenuItem>
                {!isPureAgent && (
                  <DropdownMenuItem asChild>
                    <Link to="/listings/new" className="gap-2">
                      <PlusCircle className="h-4 w-4" />
                      {t("nav_new_listing")}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/messages" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    الرسائل
                  </Link>
                </DropdownMenuItem>
                {!isPureAgent && (
                  <DropdownMenuItem asChild>
                    <Link to="/orders" className="gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      طلباتي
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/favorites" className="gap-2">
                    <Heart className="h-4 w-4" />
                    {t("nav_favorites")}
                  </Link>
                </DropdownMenuItem>

                {isPureAgent && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">
                      المسوّق
                    </DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link to="/campaigns" className="gap-2">
                        <Briefcase className="h-4 w-4" />
                        تصفح الفرص
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/referrals" className="gap-2">
                        <Link2 className="h-4 w-4" />
                        روابط الإحالة
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/wallet" className="gap-2">
                        <DollarSign className="h-4 w-4" />
                        المحفظة
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/payouts" className="gap-2">
                        <DollarSign className="h-4 w-4" />
                        طلب سحب
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/commissions" className="gap-2">
                        <DollarSign className="h-4 w-4" />
                        سجل العمولات
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/agent" className="gap-2">
                        <UserCircle2 className="h-4 w-4" />
                        ملفي كمسوق
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}

                {!isPureAgent && (
                  <>
                    <DropdownMenuSeparator />

                    {/* Account submenu */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2">
                        <UserIcon className="h-4 w-4" />
                        الحساب
                        <ChevronRight className="ms-auto h-4 w-4 opacity-60" />
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56">
                        <DropdownMenuItem asChild>
                          <Link to="/profile" className="gap-2">
                            <UserIcon className="h-4 w-4" />
                            {t("nav_profile")}
                          </Link>
                        </DropdownMenuItem>
                        {isCompany && (
                          <>
                            <DropdownMenuItem asChild>
                              <Link to="/company" className="gap-2">
                                <Building2 className="h-4 w-4" />
                                {t("nav_company_profile")}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to="/company-profile-extra" className="gap-2">
                                <Building2 className="h-4 w-4" />
                                تخصيص ملف الشركة
                              </Link>
                            </DropdownMenuItem>
                          </>
                        )}
                        {isAgent && (
                          <DropdownMenuItem asChild>
                            <Link to="/agent" className="gap-2">
                              <UserCircle2 className="h-4 w-4" />
                              {t("nav_agent_profile")}
                            </Link>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    {/* Business submenu — company/agent tools */}
                    {(isCompany || isAgent) && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="gap-2">
                          <Briefcase className="h-4 w-4" />
                          الأعمال
                          <ChevronRight className="ms-auto h-4 w-4 opacity-60" />
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-56">
                          {isCompany && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link to="/rfq/mine" className="gap-2">
                                  <ListChecks className="h-4 w-4" />
                                  طلباتي للأسعار
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to="/tenders/mine" className="gap-2">
                                  <ListChecks className="h-4 w-4" />
                                  مناقصاتي
                                </Link>
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem asChild>
                            <Link to="/commissions" className="gap-2">
                              <DollarSign className="h-4 w-4" />
                              {t("nav_commissions")}
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )}

                    {/* Marketing submenu */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2">
                        <Link2 className="h-4 w-4" />
                        التسويق
                        <ChevronRight className="ms-auto h-4 w-4 opacity-60" />
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56">
                        <DropdownMenuItem asChild>
                          <Link to="/marketing-center" className="gap-2">
                            <Link2 className="h-4 w-4" />
                            مركز التسويق
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/referral-program" className="gap-2">
                            <Link2 className="h-4 w-4" />
                            برنامج الإحالات
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </>
                )}

                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">
                      الإدارة
                    </DropdownMenuLabel>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        أدوات المشرف
                        <ChevronRight className="ms-auto h-4 w-4 opacity-60" />
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56">
                        <DropdownMenuItem asChild>
                          <Link to="/verification" className="gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            {t("nav_verification")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/moderation" className="gap-2">
                            <ListChecks className="h-4 w-4" />
                            {t("nav_moderation")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin-overview" className="gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            نظرة عامة للإدارة
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin-payments" className="gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            إدارة المدفوعات
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => void handleSignOut()}
                  className="sticky bottom-0 gap-2 border-t border-border bg-popover font-semibold text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  {t("nav_signout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/auth">{t("nav_signin")}</Link>
              </Button>
              <Button asChild size="sm" className="bg-primary hover:bg-primary-hover">
                <Link to="/auth" search={{ mode: "signup" }}>
                  <span className="sm:hidden">ابدأ</span>
                  <span className="hidden sm:inline">{t("nav_signup")}</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
      {/* Mobile inline search */}
      <div className="xl:hidden border-t border-border/60 bg-background/70 px-3 py-2">
        <GlobalSearch compact />
      </div>
    </header>
  );
}

function PrimaryLink({
  to,
  label,
  emphasis = false,
}: {
  to: "/" | "/marketplace" | "/stores" | "/companies" | "/rfq" | "/store/open";
  label: string;
  emphasis?: boolean;
}) {
  return (
    <Link
      to={to}
      className={
        emphasis
          ? "rounded-full bg-primary px-3 py-2 font-semibold text-primary-foreground transition hover:bg-primary-hover"
          : "rounded-full px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
      }
    >
      {label}
    </Link>
  );
}

function MobilePrimaryLink({
  to,
  icon,
  label,
}: {
  to: "/" | "/marketplace" | "/stores" | "/companies" | "/rfq" | "/store/open";
  icon: ReactNode;
  label: string;
}) {
  return (
    <DropdownMenuItem asChild>
      <Link to={to} className="gap-2">
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        {label}
      </Link>
    </DropdownMenuItem>
  );
}

function CartButton() {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(cartCount());
    return subscribeCart(() => setN(cartCount()));
  }, []);
  return (
    <Link
      to="/cart"
      aria-label="Cart"
      className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-muted transition"
    >
      <ShoppingCart className="h-5 w-5" />
      {n > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
          {n > 99 ? "99+" : n}
        </span>
      )}
    </Link>
  );
}
