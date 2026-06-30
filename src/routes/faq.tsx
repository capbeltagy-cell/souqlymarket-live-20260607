import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { q: "هل التسجيل في سوقلي مجاني؟", a: "نعم، التسجيل وإضافة حتى 5 إعلانات مجاني تماماً." },
  { q: "ما هي تكلفة الاشتراك المدفوع؟", a: "الباقة المدفوعة بـ 499 جنيه شهرياً وتتيح إعلانات غير محدودة وأولوية الظهور." },
  { q: "كيف أحصل على شارة التوثيق؟", a: "يمكنك طلب التوثيق من لوحة التحكم بعد رفع المستندات الرسمية لشركتك." },
  { q: "كيف يصلني العملاء؟", a: "يستطيع المشترون التواصل معك مباشرة عبر نموذج طلب السعر أو الاتصال المباشر." },
  { q: "هل يمكنني نشر مناقصة؟", a: "نعم، يمكن لأي شركة مسجلة نشر مناقصات وطلبات أسعار من قسم RFQ والمناقصات." },
  { q: "كيف تتم المعاملات المالية؟", a: "حالياً تتم المعاملات بشكل مباشر بين الطرفين. الدفع الإلكتروني داخل المنصة قيد التطوير." },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "الأسئلة الشائعة — سوقلي | FAQ" },
      { name: "description", content: "إجابات على أهم أسئلة المستخدمين حول سوقلي: التسجيل، الاشتراكات، التوثيق، طلبات الأسعار، المناقصات والمعاملات بين الشركات." },
      { property: "og:title", content: "الأسئلة الشائعة — سوقلي" },
      { property: "og:description", content: "كل ما تحتاج معرفته عن سوقلي: كيف تسجل، تنشر إعلاناتك، تستقبل العملاء وتبرم صفقاتك بثقة." },
      { property: "og:url", content: "https://souqlymarket.com/faq" },
    ],
    links: [{ rel: "canonical", href: "https://souqlymarket.com/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="container-souqly py-12 flex-1 max-w-3xl text-right">
        <h1 className="text-3xl font-bold mb-6">الأسئلة الشائعة</h1>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-right">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
      <SiteFooter />
    </div>
  );
}
