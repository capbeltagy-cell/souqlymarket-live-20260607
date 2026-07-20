import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({ meta: [{ title: "سياسة الاسترداد — سوقلي" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="container-souqly py-12 flex-1 max-w-3xl text-right">
        <h1 className="text-3xl font-bold mb-6">سياسة الاسترداد</h1>
        <div className="space-y-4 text-muted-foreground leading-loose">
          <p>تنطبق سياسة الاسترداد على اشتراكات الباقات المدفوعة والإعلانات المميزة.</p>
          <h2 className="text-lg font-semibold text-foreground">الاشتراكات الشهرية</h2>
          <p>
            يمكنك إلغاء اشتراكك في أي وقت. لن يتم تجديد الاشتراك تلقائياً بعد الإلغاء، ولا يحق
            استرداد المبلغ المدفوع للفترة الحالية.
          </p>
          <h2 className="text-lg font-semibold text-foreground">الإعلانات المميزة</h2>
          <p>الإعلانات المميزة غير قابلة للاسترداد بعد التفعيل، حيث يبدأ احتساب المدة فور الدفع.</p>
          <h2 className="text-lg font-semibold text-foreground">حالات استثنائية</h2>
          <p>
            في حال وجود مشكلة تقنية منعت تقديم الخدمة، يُرجى التواصل معنا خلال 7 أيام على
            support@souqlymarket.com لمراجعة الحالة.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
