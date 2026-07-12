import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase, LogOut, LayoutDashboard, PlusCircle, User as UserIcon, DollarSign, Link2, ShieldCheck, Building2, UserCircle2, Heart, ListChecks, MessageSquare, ShoppingBag, ChevronRight, ShoppingCart } from "lucide-react";
import { cartCount, subscribeCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "./LanguageToggle";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationBell } from "./NotificationBell";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const { t } = useI18n();
  const { user, roles, signOut } = useAuth();
  const isAdmin = roles.includes("admin");
  const isCompany = roles.includes("company");
  const isAgent = roles.includes("agent");
  const isPureAgent = isAgent && !isCompany && !isAdmin;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="container-souqly flex h-14 lg:h-16 items-center gap-2 lg:gap-4">
        <Link to="/" className="flex items-center gap-2 lg:gap-3 font-bold text-lg shrink-0">
          <div className="flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-gold">
            <Briefcase className="h-4 w-4" />
          </div>
          <span className="text-serif text-xl lg:text-2xl text-foreground tracking-tight">{t("brand")}</span>
        </Link>

        {/* Primary nav — only the essentials */}
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
          <Link to="/earn" className="px-3 py-2 rounded-full text-accent hover:text-foreground hover:bg-accent/10 transition font-semibold">اربح معنا</Link>

          {/* Secondary nav collapsed into "More" */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-3 py-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition">
                المزيد
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem asChild><Link to="/pricing">{t("nav_pricing")}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/how-it-works">كيف يعمل</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/about">من نحن</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/contact">اتصل بنا</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/faq">الأسئلة الشائعة</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="ms-auto flex items-center gap-1.5 lg:gap-2">
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
              <DropdownMenuContent align="end" className="w-60">
                {/* Essentials — always visible */}
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="gap-2"><LayoutDashboard className="h-4 w-4" />{t("nav_dashboard")}</Link>
                </DropdownMenuItem>
                {!isPureAgent && (
                  <DropdownMenuItem asChild>
                    <Link to="/listings/new" className="gap-2"><PlusCircle className="h-4 w-4" />{t("nav_new_listing")}</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/messages" className="gap-2"><MessageSquare className="h-4 w-4" />الرسائل</Link>
                </DropdownMenuItem>
                {!isPureAgent && (
                  <DropdownMenuItem asChild>
                    <Link to="/orders" className="gap-2"><ShoppingBag className="h-4 w-4" />طلباتي</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/favorites" className="gap-2"><Heart className="h-4 w-4" />{t("nav_favorites")}</Link>
                </DropdownMenuItem>

                {isPureAgent && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">المسوّق</DropdownMenuLabel>
                    <DropdownMenuItem asChild><Link to="/campaigns" className="gap-2"><Briefcase className="h-4 w-4" />تصفح الفرص</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/referrals" className="gap-2"><Link2 className="h-4 w-4" />روابط الإحالة</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/wallet" className="gap-2"><DollarSign className="h-4 w-4" />المحفظة</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/payouts" className="gap-2"><DollarSign className="h-4 w-4" />طلب سحب</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/commissions" className="gap-2"><DollarSign className="h-4 w-4" />سجل العمولات</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/agent" className="gap-2"><UserCircle2 className="h-4 w-4" />ملفي كمسوق</Link></DropdownMenuItem>
                  </>
                )}

                {!isPureAgent && (
                  <>
                    <DropdownMenuSeparator />

                    {/* Account submenu */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2"><UserIcon className="h-4 w-4" />الحساب<ChevronRight className="ms-auto h-4 w-4 opacity-60" /></DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56">
                        <DropdownMenuItem asChild><Link to="/profile" className="gap-2"><UserIcon className="h-4 w-4" />{t("nav_profile")}</Link></DropdownMenuItem>
                        {isCompany && (
                          <>
                            <DropdownMenuItem asChild><Link to="/company" className="gap-2"><Building2 className="h-4 w-4" />{t("nav_company_profile")}</Link></DropdownMenuItem>
                            <DropdownMenuItem asChild><Link to="/company-profile-extra" className="gap-2"><Building2 className="h-4 w-4" />تخصيص ملف الشركة</Link></DropdownMenuItem>
                          </>
                        )}
                        {isAgent && (
                          <DropdownMenuItem asChild><Link to="/agent" className="gap-2"><UserCircle2 className="h-4 w-4" />{t("nav_agent_profile")}</Link></DropdownMenuItem>
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    {/* Business submenu — company/agent tools */}
                    {(isCompany || isAgent) && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="gap-2"><Briefcase className="h-4 w-4" />الأعمال<ChevronRight className="ms-auto h-4 w-4 opacity-60" /></DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-56">
                          {isCompany && (
                            <>
                              <DropdownMenuItem asChild><Link to="/rfq/mine" className="gap-2"><ListChecks className="h-4 w-4" />طلباتي للأسعار</Link></DropdownMenuItem>
                              <DropdownMenuItem asChild><Link to="/tenders/mine" className="gap-2"><ListChecks className="h-4 w-4" />مناقصاتي</Link></DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem asChild><Link to="/commissions" className="gap-2"><DollarSign className="h-4 w-4" />{t("nav_commissions")}</Link></DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )}

                    {/* Marketing submenu */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2"><Link2 className="h-4 w-4" />التسويق<ChevronRight className="ms-auto h-4 w-4 opacity-60" /></DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56">
                        <DropdownMenuItem asChild><Link to="/marketing-center" className="gap-2"><Link2 className="h-4 w-4" />مركز التسويق</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to="/referral-program" className="gap-2"><Link2 className="h-4 w-4" />برنامج الإحالات</Link></DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </>
                )}

                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">الإدارة</DropdownMenuLabel>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2"><ShieldCheck className="h-4 w-4" />أدوات المشرف<ChevronRight className="ms-auto h-4 w-4 opacity-60" /></DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56">
                        <DropdownMenuItem asChild><Link to="/verification" className="gap-2"><ShieldCheck className="h-4 w-4" />{t("nav_verification")}</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to="/moderation" className="gap-2"><ListChecks className="h-4 w-4" />{t("nav_moderation")}</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to="/admin-overview" className="gap-2"><ShieldCheck className="h-4 w-4" />نظرة عامة للإدارة</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to="/admin-payments" className="gap-2"><ShieldCheck className="h-4 w-4" />إدارة المدفوعات</Link></DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
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
      {/* Mobile inline search */}
      <div className="xl:hidden border-t border-border/60 bg-background/70 px-3 py-2">
        <GlobalSearch compact />
      </div>
    </header>
  );
}
