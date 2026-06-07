import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import { createWholesale, listCategories } from "@/lib/phase3.functions";

export const Route = createFileRoute("/_authenticated/wholesale/new")({ component: NewWholesale });

function NewWholesale() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [moq, setMoq] = useState("");
  const [price, setPrice] = useState("");
  const [gov, setGov] = useState("");
  const [cat, setCat] = useState("");
  const [imgs, setImgs] = useState("");
  const [cats, setCats] = useState<{ slug: string; name_ar: string; name_en: string }[]>([]);
  useEffect(() => { listCategories().then((r) => setCats(r.categories)); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await createWholesale({ data: {
        title, description: desc || undefined, moq: Number(moq),
        price_per_unit: price ? Number(price) : undefined,
        governorate: gov || undefined, category_slug: cat || undefined,
        images: imgs.split(/\s+/).filter(Boolean),
      } });
      toast.success(ar ? "تم النشر" : "Posted");
      nav({ to: "/wholesale/$id", params: { id: r.id } });
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">{ar ? "منتج جملة جديد" : "New Wholesale Product"}</h1>
        <form onSubmit={submit} className="space-y-3">
          <Input required maxLength={200} placeholder={ar ? "اسم المنتج" : "Product title"} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea rows={5} placeholder={ar ? "الوصف" : "Description"} value={desc} onChange={(e) => setDesc(e.target.value)} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input type="number" min="1" required placeholder={ar ? "الحد الأدنى للطلب" : "MOQ"} value={moq} onChange={(e) => setMoq(e.target.value)} />
            <Input type="number" min="0" step="0.01" placeholder={ar ? "السعر/وحدة (ج.م)" : "Price/unit (EGP)"} value={price} onChange={(e) => setPrice(e.target.value)} />
            <Input placeholder={ar ? "المحافظة" : "Governorate"} value={gov} onChange={(e) => setGov(e.target.value)} />
            <select className="h-10 rounded-md border border-input bg-background px-3" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">{ar ? "اختر القسم" : "Category"}</option>
              {cats.map((c) => <option key={c.slug} value={c.slug}>{ar ? c.name_ar : c.name_en}</option>)}
            </select>
          </div>
          <Textarea rows={2} placeholder={ar ? "روابط الصور (مفصولة بمسافات)" : "Image URLs (space-separated)"} value={imgs} onChange={(e) => setImgs(e.target.value)} />
          <Button type="submit" className="bg-primary hover:bg-primary-hover">{ar ? "نشر" : "Publish"}</Button>
        </form>
      </section>
      <SiteFooter />
    </div>
  );
}
