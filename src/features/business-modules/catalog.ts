import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  Boxes,
  Calculator,
  ContactRound,
  FileText,
  Megaphone,
  MonitorSmartphone,
  PackageCheck,
  ReceiptText,
  ShoppingCart,
  UsersRound,
} from "lucide-react";

export type BusinessModuleStatus = "available" | "planned";

export type BusinessModuleDefinition = {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  status: BusinessModuleStatus;
  href?: string;
};

// The catalog is the single navigation source for business modules. New modules
// can be registered here without changing the page layout or main navigation.
export const BUSINESS_MODULES: BusinessModuleDefinition[] = [
  {
    key: "crm",
    name: "إدارة العملاء CRM",
    description: "متابعة العملاء المحتملين ومسار التواصل.",
    icon: ContactRound,
    status: "available",
    href: "/leads",
  },
  {
    key: "inventory",
    name: "المخزون",
    description: "متابعة المنتجات والكميات المتاحة.",
    icon: Boxes,
    status: "available",
    href: "/store#inventory",
  },
  {
    key: "invoices",
    name: "الفواتير",
    description: "عرض فواتير الحساب والطلبات.",
    icon: ReceiptText,
    status: "available",
    href: "/invoices",
  },
  {
    key: "marketing",
    name: "التسويق",
    description: "إدارة الحملات وفرص المسوقين.",
    icon: Megaphone,
    status: "available",
    href: "/marketing-center",
  },
  {
    key: "ai",
    name: "أدوات الذكاء الاصطناعي",
    description: "أدوات مساعدة لإعداد المحتوى التسويقي.",
    icon: Bot,
    status: "available",
    href: "/ai-tools",
  },
  {
    key: "reports",
    name: "التقارير",
    description: "مؤشرات الأداء وتحليلات النشاط.",
    icon: BarChart3,
    status: "available",
    href: "/analytics",
  },
  {
    key: "purchases",
    name: "المشتريات",
    description: "تنظيم أوامر الشراء والموردين.",
    icon: ShoppingCart,
    status: "planned",
  },
  {
    key: "sales",
    name: "المبيعات",
    description: "إدارة دورة البيع في مساحة عمل موحدة.",
    icon: PackageCheck,
    status: "planned",
  },
  {
    key: "hr",
    name: "الموارد البشرية",
    description: "إدارة الفريق والصلاحيات التشغيلية.",
    icon: UsersRound,
    status: "planned",
  },
  {
    key: "accounting",
    name: "المحاسبة",
    description: "القيود والتقارير المالية المتقدمة.",
    icon: Calculator,
    status: "planned",
  },
  {
    key: "documents",
    name: "المستندات",
    description: "تنظيم مستندات الشركة والتعاملات.",
    icon: FileText,
    status: "planned",
  },
  {
    key: "pos",
    name: "نقاط البيع POS",
    description: "إدارة المبيعات المباشرة والفروع.",
    icon: MonitorSmartphone,
    status: "planned",
  },
];
