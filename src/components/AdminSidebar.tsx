import { Link, useLocation } from "@tanstack/react-router";
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
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";

interface AdminSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MENU_ITEMS = [
  {
    section: "overview",
    items: [
      { icon: LayoutDashboard, label: "الرئيسية", href: "/admin-overview" },
      { icon: BarChart3, label: "اللوحة التنفيذية", href: "/admin-executive" },
    ],
  },
  {
    section: "platform_management",
    items: [
      { icon: Users, label: "المستخدمون", href: "#" },
      { icon: Building2, label: "الشركات", href: "/admin-companies" },
      { icon: Store, label: "المتاجر", href: "/admin-stores" },
      { icon: Package, label: "المنتجات", href: "#" },
      { icon: ShoppingBag, label: "الطلبات", href: "#" },
      { icon: Lightbulb, label: "المناقصات", href: "#" },
      { icon: ShoppingCart, label: "طلبات الشراء", href: "#" },
      { icon: AlertCircle, label: "البلاغات", href: "#" },
    ],
  },
  {
    section: "financial",
    items: [
      { icon: CreditCard, label: "المدفوعات", href: "/admin-payments" },
      { icon: DollarSign, label: "الإيداعات", href: "/admin-deposits" },
      { icon: ArrowDownUp, label: "السحوبات", href: "/admin-withdrawals" },
      { icon: TrendingUp, label: "الإيرادات", href: "/admin-revenue" },
      { icon: Percent, label: "العمولات", href: "/admin-commissions" },
      { icon: Wallet, label: "الاشتراكات", href: "#" },
      { icon: GripHorizontal, label: "الفواتير", href: "#" },
    ],
  },
  {
    section: "content_system",
    items: [
      { icon: Bell, label: "الإشعارات", href: "#" },
      { icon: Zap, label: "محتوى الإطلاق", href: "/admin-launch-content" },
      { icon: Settings, label: "الإعدادات", href: "/admin-platform-settings" },
      { icon: Archive, label: "سجل العمليات", href: "#" },
    ],
  },
];

export function AdminSidebar({ open, onOpenChange }: AdminSidebarProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const isActive = (href: string) => location.pathname === href;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => onOpenChange(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 start-0 z-40 w-64 bg-white border-e border-gray-200 overflow-y-auto transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-gray-900">سوقلي</h2>
            <p className="text-xs text-gray-500">لوحة الإدارة</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="lg:hidden inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-gray-100 text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-4 p-4">
          {MENU_ITEMS.map((section) => (
            <div key={section.section}>
              <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.section}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const disabled = item.href === "#";
                  return (
                    <Link
                      key={item.href}
                      to={disabled ? undefined : (item.href as any)}
                      onClick={() => !disabled && onOpenChange(false)}
                      className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        disabled
                          ? "text-gray-400 cursor-not-allowed"
                          : active
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <Icon className="h-4 w-4 inline me-2" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="absolute bottom-0 inset-x-0 border-t border-gray-200 bg-white p-4 space-y-3">
          <div className="px-3 py-2 rounded-md bg-gray-50">
            <p className="text-xs text-gray-500">متسجل الدخول</p>
            <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  );
}
