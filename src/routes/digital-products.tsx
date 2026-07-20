import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  Code2,
  FileBadge,
  FileText,
  Layers3,
  Palette,
  PlugZap,
  ShieldCheck,
} from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";

const categories = [
  { name: "كتب وملفات PDF", icon: FileText },
  { name: "قوالب جاهزة", icon: Layers3 },
  { name: "دورات تعليمية", icon: BookOpen },
  { name: "تصاميم", icon: Palette },
  { name: "أكواد مصدرية", icon: Code2 },
  { name: "إضافات", icon: PlugZap },
  { name: "تراخيص رقمية", icon: FileBadge },
] as const;

export const Route = createFileRoute("/digital-products")({
  head: () => ({
    meta: [
      { title: "المنتجات الرقمية — سوقلي" },
      {
        name: "description",
        content: "قسم سوقلي للملفات والقوالب والدورات والتصاميم والبرمجيات والتراخيص الرقمية.",
      },
      { property: "og:title", content: "المنتجات الرقمية — سوقلي" },
      { property: "og:description", content: "بنية آمنة لبيع وتسليم المنتجات الرقمية على سوقلي." },
    ],
  }),
  component: DigitalProductsPage,
});

function DigitalProductsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-card">
          <div className="container-souqly py-10 sm:py-14">
            <div className="max-w-3xl">
              <p className="mb-3 text-sm font-semibold text-primary">قسم جديد على سوقلي</p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">المنتجات الرقمية</h1>
              <p className="mt-3 text-base leading-8 text-muted-foreground sm:text-lg">
                قسم مخصص للأصول الرقمية القابلة للتحميل أو الترخيص، مع فصل واضح بين المنتج المادي
                والمنتج الرقمي.
              </p>
            </div>
          </div>
        </section>

        <section className="container-souqly py-8 sm:py-12">
          <h2 className="text-xl font-semibold">أنواع المنتجات المدعومة في البنية</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map(({ name, icon: Icon }) => (
              <div key={name} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <Icon className="h-6 w-6 text-primary" />
                <p className="mt-3 text-sm font-medium">{name}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex max-w-2xl gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-semibold">النشر والشراء غير مفعّلين بعد</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    لن نعرض منتجات تجريبية أو نقبل مدفوعات قبل اكتمال صلاحيات الملفات، التسليم
                    الآمن، الترخيص، وسياسة الاسترداد من الخادم.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline">
                <Link to="/contact">تواصل مع فريق سوقلي</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
