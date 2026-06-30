import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن — سوقلي | About Souqly" },
      { name: "description", content: "تعرّف على سوقلي، أول سوق B2B متخصص يربط الشركات المصرية والمصانع والموردين بالمشترين ووكلاء المبيعات في منصة واحدة موثوقة." },
      { property: "og:title", content: "من نحن — سوقلي | About Souqly" },
      { property: "og:description", content: "قصتنا ورسالتنا: تمكين الشركات المصرية بمنصة B2B احترافية تفتح أسواقاً جديدة وتسهّل الصفقات بين الشركات." },
      { property: "og:url", content: "https://souqlymarket.com/about" },
    ],
    links: [{ rel: "canonical", href: "https://souqlymarket.com/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="container-souqly py-12 flex-1 prose prose-slate max-w-3xl rtl text-right">
        <h1 className="text-3xl font-bold mb-6">من نحن</h1>
        <p className="text-muted-foreground leading-loose">
          <strong>سوقلي</strong> هو السوق الإلكتروني المتخصص لرجال الأعمال والشركات في مصر.
          نربط المصانع والموردين والخدمات والمشترين في منصة واحدة آمنة وموثوقة.
        </p>
        <h2 className="text-xl font-semibold mt-8 mb-3">رسالتنا</h2>
        <p className="text-muted-foreground leading-loose">
          تمكين الاقتصاد المصري من خلال توفير منصة B2B احترافية تسهل التواصل التجاري بين الشركات وتفتح أسواقاً جديدة.
        </p>
        <h2 className="text-xl font-semibold mt-8 mb-3">رؤيتنا</h2>
        <p className="text-muted-foreground leading-loose">
          أن نصبح المنصة الأولى للتجارة بين الشركات في مصر والوطن العربي.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
