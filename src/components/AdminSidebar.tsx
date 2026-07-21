import { Link, useLocation } from "@tanstack/react-router";
import {
  X,
  LayoutDashboard,
  Store,
  Building2,
  Package,
  DollarSign,
  Wallet,
  ArrowDownUp,
  TrendingUp,
  Percent,
  Zap,
  Settings,
  LogOut,
  BarChart3,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AdminSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type MenuItem = {
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
  exact?: boolean;
};

type MenuSection = {
  section: string;
  items: MenuItem[];
};

const MENU_ITEMS: MenuSection[] = [
  {
    section: "نظرة عامة",
    items: [
      { icon: LayoutDashboard, label: "الرئيسية", href: "/admin-overview", exact: true },
      { icon: BarChart3, label: "اللوحة التنفيذية", href: "/admin-executive", exact: true },
    ],
  },
  {
    section: "إدارة المنصة",
    items: [
      { icon: Building2, label: "الشركات", href: "/admin-companies" },
      { icon: Store, label: "المتاجر", href: "/admin-stores" },
      { icon: Package, label: "المنتجات والإعلانات", href: "/admin-launch-content" },
    ],
  },
  {
    section: "المالية",
    items: [
      { icon: CreditCard, label: "المدفوعات", href: "/admin-payments" },
      { icon: DollarSign, label: "الإيداعات", href: "/admin-deposits" },
      { icon: ArrowDownUp, label: "السحوبات", href: "/admin-withdrawals" },
      { icon: TrendingUp, label: "الإيرادات", href: "/admin-revenue" },
      { icon: Percent, label: "العمولات", href: "/admin-commissions" },
      { icon: Wallet, label: "الاشتراكات", href: "/admin-platform-settings" },
    ],
  },
  {
    section: "المحتوى والنظام",
    items: [
      { icon: Zap, label: "محتوى الإطلاق", href: "/admin-launch-content" },
      { icon: Settings, label: "الإعدادات", href: "/admin-platform-settings" },
    ],
  },
];

export function AdminSidebar({ open, onOpenChange }: AdminSidebarProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const isActive = (item: MenuItem) =>
    item.exact
      ? location.pathname === item.href
      : location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          className="fixed inset-0 z-30 bg-foreground/40 backdrop-blur-sm lg:hidden"
          onClick={() => onOpenChange(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 start-0 z-40 flex w-64 flex-col border-e border-border bg-card shadow-xl transition-transform duration-200 lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">سوقلي</h2>
            <p className="text-xs text-muted-foreground">لوحة الإدارة</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-4 pb-6">
          {MENU_ITEMS.map((section) => (
            <div key={section.section}>
              <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                {section.section}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item);
                  return (
                    <Link
                      key={`${section.section}-${item.label}`}
                      to={item.href as never}
                      onClick={() => onOpenChange(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-3 border-t border-border bg-card p-4">
          <div className="rounded-lg bg-muted px-3 py-2">
            <p className="text-xs text-muted-foreground">الحساب الحالي</p>
            <p className="truncate text-sm font-medium text-foreground">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  );
}
