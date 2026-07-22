import type { LucideIcon } from "lucide-react";
import { BarChart3, Bot, Boxes, ContactRound, Megaphone, ReceiptText, ShoppingCart, Truck } from "lucide-react";

export type BusinessModuleDefinition = {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
};

// Single navigation source for business modules. Operational modules open the
// unified company workspace so every visible card leads to a working flow.
export const BUSINESS_MODULES: BusinessModuleDefinition[] = [
  {
    key: "crm",
    name: "إدارة العملاء CRM",
    description: "إضافة العملاء ومتابعة بيانات التواصل من مساحة عمل واحدة.",
    icon: ContactRound,
    href: "/business-suite",
  },
  {
    key: "inventory",
    name: "المخزون",
    description: "إدارة الأصناف والكميات وحدود التنبيه والأسعار.",
    icon: Boxes,
    href: "/business-suite",
  },
  {
    key: "invoices",
    name: "الفواتير",
    description: "إصدار الفواتير ومتابعة المدفوع والمستحق.",
    icon: ReceiptText,
    href: "/business-suite",
  },
  {
    key: "sales",
    name: "المبيعات",
    description: "إنشاء أوامر البيع وربطها بالعملاء ومتابعة قيمتها.",
    icon: ShoppingCart,
    href: "/business-suite",
  },
  {
    key: "purchases",
    name: "المشتريات والموردون",
    description: "إدارة الموردين وإنشاء أوامر الشراء ومواعيد التوريد.",
    icon: Truck,
    href: "/business-suite",
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
