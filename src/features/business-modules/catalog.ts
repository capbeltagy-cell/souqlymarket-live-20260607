import type { LucideIcon } from "lucide-react";
import { BarChart3, Bot, Boxes, ContactRound, Megaphone, ReceiptText } from "lucide-react";

export type BusinessModuleDefinition = {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
};

// Single navigation source for business modules. Core operational modules now
// open the unified company workspace instead of old placeholder destinations.
export const BUSINESS_MODULES: BusinessModuleDefinition[] = [
  {
    key: "crm",
    name: "إدارة العملاء CRM",
    description: "إضافة العملاء ومتابعة بيانات التواصل من مساحة عمل واحدة.",
    icon: ContactRound,
    href: "/business-suite?tab=crm",
  },
  {
    key: "inventory",
    name: "المخزون",
    description: "إدارة الأصناف والكميات وحدود التنبيه والأسعار.",
    icon: Boxes,
    href: "/business-suite?tab=inventory",
  },
  {
    key: "invoices",
    name: "الفواتير",
    description: "متابعة الفواتير والمبالغ المدفوعة والمستحقة.",
    icon: ReceiptText,
    href: "/business-suite?tab=invoices",
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
