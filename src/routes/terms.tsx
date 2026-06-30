import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "شروط الاستخدام — سوقلي | Terms of Service" },
      { name: "description", content: "شروط استخدام منصة سوقلي B2B: قواعد نشر الإعلانات، حقوق وواجبات الشركات والوكلاء، حدود المسؤولية، وآلية تعديل الشروط." },
      { property: "og:title", content: "شروط الاستخدام — سوقلي" },
      { property: "og:description", content: "القواعد التي تحكم استخدام منصة سوقلي والعلاقة بين الشركات والوكلاء والمشترين." },
      { property: "og:url", content: "https://souqlymarket.com/terms" },
    ],
    links: [{ rel: "canonical", href: "https://souqlymarket.com/terms" }],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="container-souqly py-12 flex-1 max-w-3xl text-right">
        <h1 className="text-3xl font-bold mb-6">شروط الاستخدام</h1>
        <div className="space-y-4 text-muted-foreground leading-loose">
          <p>باستخدامك منصة سوقلي فإنك توافق على الشروط التالية:</p>
          <h2 className="text-lg font-semibold text-foreground">١. التسجيل</h2>
          <p>يجب توفير معلومات صحيحة ودقيقة عند التسجيل. أنت مسؤول عن الحفاظ على سرية بيانات حسابك.</p>
          <h2 className="text-lg font-semibold text-foreground">٢. المحتوى</h2>
          <p>أنت مسؤول عن جميع الإعلانات والبيانات التي تنشرها. يُمنع نشر محتوى مخالف للقانون المصري.</p>
          <h2 className="text-lg font-semibold text-foreground">٣. المعاملات</h2>
          <p>سوقلي منصة وسيطة فقط ولا يتحمل مسؤولية المعاملات بين المستخدمين. يُنصح بالتحقق من الطرف الآخر قبل إبرام أي صفقة.</p>
          <h2 className="text-lg font-semibold text-foreground">٤. الإلغاء</h2>
          <p>يحق لإدارة سوقلي تعليق أو إلغاء أي حساب يخالف الشروط دون إشعار مسبق.</p>
          <h2 className="text-lg font-semibold text-foreground">٥. التعديلات</h2>
          <p>قد نقوم بتحديث هذه الشروط من وقت لآخر، وسيتم إشعار المستخدمين بأي تغييرات جوهرية.</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
