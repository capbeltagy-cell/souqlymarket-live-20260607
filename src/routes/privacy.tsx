import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "سياسة الخصوصية — سوقلي" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="container-souqly py-12 flex-1 max-w-3xl text-right">
        <h1 className="text-3xl font-bold mb-6">سياسة الخصوصية</h1>
        <div className="space-y-4 text-muted-foreground leading-loose">
          <p>نحن في سوقلي نلتزم بحماية خصوصية مستخدمينا. هذه السياسة توضح كيفية جمع واستخدام بياناتك.</p>
          <h2 className="text-lg font-semibold text-foreground">البيانات التي نجمعها</h2>
          <p>الاسم، البريد الإلكتروني، رقم الهاتف، بيانات الشركة، ومحتوى الإعلانات التي تنشرها.</p>
          <h2 className="text-lg font-semibold text-foreground">كيف نستخدم بياناتك</h2>
          <p>لتشغيل المنصة، إرسال إشعارات الطلبات، تحسين الخدمة، والتواصل معك بشأن حسابك.</p>
          <h2 className="text-lg font-semibold text-foreground">مشاركة البيانات</h2>
          <p>لا نبيع بياناتك لأي طرف ثالث. قد تُعرض بيانات الاتصال الخاصة بشركتك للمشترين المهتمين.</p>
          <h2 className="text-lg font-semibold text-foreground">حقوقك</h2>
          <p>يحق لك طلب تعديل أو حذف بياناتك في أي وقت بمراسلتنا على support@souqlymarket.com</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
