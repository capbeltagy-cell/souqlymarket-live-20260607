import type { LucideIcon } from "lucide-react";
import { BarChart3, Bot, Boxes, ContactRound, Megaphone, ReceiptText } from "lucide-react";

export type BusinessModuleDefinition = {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
};

// The catalog is the single navigation source for business modules. New modules
// can be registered here without changing the page layout or main navigation.
export const BUSINESS_MODULES: BusinessModuleDefinition[] = [
  {
    key: "crm",
    name: "إدارة العملاء CRM",
    description: "متابعة العملاء المحتملين ومسار التواصل.",
    icon: ContactRound,
    href: "/leads",
  },
  {
    key: "inventory",
    name: "المخزون",
    description: "متابعة المنتجات والكميات المتاحة.",
    icon: Boxes,
    href: "/store#inventory",
  },
  {
    key: "invoices",
    name: "الفواتير",
    description: "عرض فواتير الحساب والطلبات.",
    icon: ReceiptText,
    href: "/invoices",
  },
  {
    key: "marketing",
    name: "التسويق",
    description: "إدارة الحملات وفرص المسوقين.",
    icon: Megaphone,
    href: "/marketing-center",
  },
  {
    key: "ai",
    name: "أدوات الذكاء الاصطناعي",
    description: "أدوات مساعدة لإعداد المحتوى التسويقي.",
    icon: Bot,
    href: "/ai-tools",
  },
  {
    key: "reports",
    name: "التقارير",
    description: "مؤشرات الأداء وتحليلات النشاط.",
    icon: BarChart3,
    href: "/analytics",
  },
];
