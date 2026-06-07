import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { listWholesale, listCategories } from "@/lib/phase3.functions";

export const Route = createFileRoute("/wholesale")({
  head: () => ({ meta: [{ title: "سوق الجملة — Souqly" }, { name: "description", content: "اشتري بالجملة من مصانع وموردين موثوقين" }] }),
  component: WholesalePage,
});

function WholesalePage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [gov, setGov] = useState("");
  const [cats, setCats] = useState<{ slug: string; name_ar: string; name_en: string }[]>([]);

  useEffect(() => { listCategories().then((r) => setCats(r.categories)); }, []);
  useEffect(() => {
    listWholesale({ data: { q: q || undefined, category_slug: cat || undefined, governorate: gov || undefined } })
      .then((r) => setItems(r.items));
  }, [q, cat, gov]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="bg-surface-2 border-b border-border">
        <div className="container-souqly py-8">
          <h1 className="text-3xl font-bold mb-2">{ar ? "سوق الجملة" : "Wholesale Market"}</h1>
          <p className="text-muted-foreground">{ar ? "أسعار جملة وحد أدنى للطلب من شركات معتمدة" : "Bulk pricing with MOQ from verified companies"}</p>
          <div className="grid sm:grid-cols-3 gap-3 mt-4">
            <Input placeholder={ar ? "ابحث عن منتج" : "Search product"} value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="h-10 rounded-md border border-input bg-background px-3" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">{ar ? "كل الأقسام" : "All categories"}</option>
              {cats.map((c) => <option key={c.slug} value={c.slug}>{ar ? c.name_ar : c.name_en}</option>)}
            </select>
            <Input placeholder={ar ? "المحافظة" : "Governorate"} value={gov} onChange={(e) => setGov(e.target.value)} />
          </div>
        </div>
      </section>
      <section className="container-souqly py-8 flex-1">
        <div className="flex justify-end mb-4"><Button asChild className="bg-primary hover:bg-primary-hover"><Link to="/wholesale/new">{ar ? "+ أضف منتج جملة" : "+ Add wholesale product"}</Link></Button></div>
        {items.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">{ar ? "لا توجد منتجات بعد" : "No products yet"}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((it) => (
              <Link key={it.id} to="/wholesale/$id" params={{ id: it.id }} className="rounded-lg border border-border bg-card overflow-hidden hover:shadow-md transition">
                {it.images?.[0] && <img src={it.images[0]} alt="" className="aspect-video w-full object-cover" />}
                <div className="p-4 space-y-1">
                  <div className="font-semibold line-clamp-1">{it.title}</div>
                  <div className="text-sm text-muted-foreground">{ar ? "الحد الأدنى" : "MOQ"}: {it.moq}</div>
                  {it.price_per_unit && <div className="text-primary font-semibold">{it.price_per_unit} {it.currency} / {ar ? "وحدة" : "unit"}</div>}
                  <div className="text-xs text-muted-foreground">{ar ? it.companies?.name_ar : it.companies?.name_en}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
