import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMarketerGuard } from "@/hooks/useMarketerGuard";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import { createRfq, listCategories } from "@/lib/phase3.functions";

export const Route = createFileRoute("/_authenticated/rfq/new")({ component: NewRfq });

function NewRfq() {
  useMarketerGuard();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [bmin, setBmin] = useState("");
  const [bmax, setBmax] = useState("");
  const [gov, setGov] = useState("");
  const [cats, setCats] = useState<{ slug: string; name_ar: string; name_en: string }[]>([]);
  useEffect(() => {
    listCategories().then((r) => setCats(r.categories));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await createRfq({
        data: {
          title,
          description: desc || undefined,
          category_slug: cat || undefined,
          quantity: qty ? Number(qty) : undefined,
          unit: unit || undefined,
          budget_min: bmin ? Number(bmin) : undefined,
          budget_max: bmax ? Number(bmax) : undefined,
          governorate: gov || undefined,
        },
      });
      toast.success(ar ? "تم النشر" : "Posted");
      nav({ to: "/rfq/$id", params: { id: r.id } });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">{ar ? "طلب عرض سعر جديد" : "New RFQ"}</h1>
        <form onSubmit={submit} className="space-y-3">
          <Input
            required
            maxLength={200}
            placeholder={ar ? "العنوان" : "Title"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            rows={5}
            placeholder={ar ? "الوصف التفصيلي" : "Detailed description"}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <select
              className="h-10 rounded-md border border-input bg-background px-3"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
            >
              <option value="">{ar ? "اختر القسم" : "Category"}</option>
              {cats.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {ar ? c.name_ar : c.name_en}
                </option>
              ))}
            </select>
            <Input
              placeholder={ar ? "المحافظة" : "Governorate"}
              value={gov}
              onChange={(e) => setGov(e.target.value)}
            />
            <Input
              type="number"
              min="1"
              placeholder={ar ? "الكمية" : "Quantity"}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
            <Input
              placeholder={ar ? "الوحدة (قطعة/كجم/...)" : "Unit"}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
            <Input
              type="number"
              min="0"
              placeholder={ar ? "الحد الأدنى للميزانية" : "Budget min"}
              value={bmin}
              onChange={(e) => setBmin(e.target.value)}
            />
            <Input
              type="number"
              min="0"
              placeholder={ar ? "الحد الأقصى للميزانية" : "Budget max"}
              value={bmax}
              onChange={(e) => setBmax(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {ar
              ? "يمكنك إضافة المرفقات لاحقاً عبر روابط الملفات."
              : "You can attach file URLs later."}
          </p>
          <Button type="submit" className="bg-primary hover:bg-primary-hover">
            {ar ? "نشر الطلب" : "Publish"}
          </Button>
        </form>
      </section>
      <SiteFooter />
    </div>
  );
}
