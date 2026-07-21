import { useLocation } from "@tanstack/react-router";
import {
  X,
  LayoutDashboard,
  Store,
  Building2,
  ShoppingCart,
  Package,
  Lightbulb,
  ShoppingBag,
  AlertCircle,
  DollarSign,
  Wallet,
  ArrowDownUp,
  TrendingUp,
  Percent,
  GripHorizontal,
  Bell,
  Zap,
  Settings,
  Archive,
  LogOut,
  BarChart3,
  Users,
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
  href?: string;
};

type MenuSection = {
  section: string;
  items: MenuItem[];
};

const MENU_ITEMS: MenuSection[] = [
  {
    section: "نظرة عامة",
    items: [
      { icon: LayoutDashboard, label: "الرئيسية", href: "/admin-overview" },
      { icon: BarChart3, label: "اللوحة التنفيذية", href: "/admin-executive" },
    ],
  },
  {
    section: "إدارة المنصة",
    items: [
      { icon: Users, label: "المستخدمون" },
      { icon: Building2, label: "الشركات", href: "/admin-companies" },
      { icon: Store, label: "المتاجر", href: "/admin-stores" },
      { icon: Package, label: "المنتجات والإعلانات" },
      { icon: ShoppingBag, label: "الطلبات" },
      { icon: Lightbulb, label: "المناقصات" },
      { icon: ShoppingCart, label: "طلبات الشراء" },
      { icon: AlertCircle, label: "البلاغات والمراجعة" },
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
      { icon: Wallet, label: "الاشتراكات" },
      { icon: GripHorizontal, label: "الفواتير" },
    ],
  },
  {
    section: "المحتوى والنظام",
    items: [
      { icon: Bell, label: "الإشعارات" },
      { icon: Zap, label: "محتوى الإطلاق", href: "/admin-launch-content" },
      { icon: Settings, label: "الإعدادات", href: "/admin-platform-settings" },
      { icon: Archive, label: "سجل العمليات" },
    ],
  },
];

export function AdminSidebar({ open, onOpenChange }: AdminSidebarProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const isActive = (href: string) => location.pathname === href;

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => onOpenChange(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 start-0 z-40 flex w-64 flex-col border-e border-gray-200 bg-white transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">سوقلي</h2>
            <p className="text-xs text-gray-500">لوحة الإدارة</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-4 pb-6">
          {MENU_ITEMS.map((section) => (
            <div key={section.section}>
              <h3 className="px-3 py-2 text-xs font-semibold text-gray-500">
                {section.section}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.href ? isActive(item.href) : false;
                  const classes = `flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    item.href
                      ? active
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                      : "cursor-not-allowed text-gray-400"
                  }`;

                  return item.href ? (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={() => onOpenChange(false)}
                      className={classes}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </a>
                  ) : (
                    <button key={item.label} type="button" disabled className={classes}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-gray-200 bg-white p-4 space-y-3">
          <div className="rounded-md bg-gray-50 px-3 py-2">
            <p className="text-xs text-gray-500">الحساب الحالي</p>
            <p className="truncate text-sm font-medium text-gray-900">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  );
}
