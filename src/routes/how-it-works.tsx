import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({ meta: [{ title: "كيف يعمل سوقلي" }] }),
  component: Page,
});

function Page() {
  const steps = [
    { n: 1, t: "سجل حسابك", d: "أنشئ حساب شركة أو وكيل مبيعات مجاناً خلال دقيقة." },
    { n: 2, t: "أنشئ ملف شركتك", d: "أضف بيانات شركتك ومنتجاتك وخدماتك." },
    { n: 3, t: "ابدأ بنشر إعلاناتك", d: "أضف حتى 5 إعلانات مجاناً، أو ترقّ للباقة المدفوعة." },
    { n: 4, t: "استقبل العملاء", d: "احصل على طلبات أسعار، عروض، ومناقصات من مشترين حقيقيين." },
    { n: 5, t: "أبرم الصفقات", d: "تواصل مباشرة، تفاوض، وأبرم اتفاقاتك بثقة." },
  ];
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="container-souqly py-12 flex-1 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8 text-right">كيف يعمل سوقلي</h1>
        <ol className="space-y-5">
          {steps.map((s) => (
            <li key={s.n} className="flex gap-4 items-start rounded-lg border border-border bg-card p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">{s.n}</div>
              <div className="text-right flex-1">
                <h3 className="font-semibold mb-1">{s.t}</h3>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </main>
      <SiteFooter />
    </div>
  );
}
