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
import { createTender, listCategories } from "@/lib/phase3.functions";

export const Route = createFileRoute("/_authenticated/tenders/new")({ component: NewTender });

function NewTender() {
  useMarketerGuard();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("");
  const [gov, setGov] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [cats, setCats] = useState<{ slug: string; name_ar: string; name_en: string }[]>([]);
  useEffect(() => {
    listCategories().then((r) => setCats(r.categories));
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await createTender({
        data: {
          title,
          description: desc || undefined,
          category_slug: cat || undefined,
          governorate: gov || undefined,
          budget: budget ? Number(budget) : undefined,
          deadline: deadline || undefined,
        },
      });
      toast.success(ar ? "تم نشر المناقصة" : "Tender published");
      nav({ to: "/tenders/$id", params: { id: r.id } });
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">{ar ? "نشر مناقصة جديدة" : "Publish a Tender"}</h1>
        <form onSubmit={submit} className="space-y-3">
          <Input
            required
            maxLength={200}
            placeholder={ar ? "عنوان المناقصة" : "Tender title"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            rows={6}
            placeholder={ar ? "نطاق العمل والمتطلبات" : "Scope and requirements"}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <select
              className="h-10 rounded-md border border-input bg-background px-3"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
            >
              <option value="">{ar ? "القسم" : "Category"}</option>
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
              min="0"
              placeholder={ar ? "الميزانية (ج.م)" : "Budget (EGP)"}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <Button type="submit" className="bg-primary hover:bg-primary-hover">
            {ar ? "نشر" : "Publish"}
          </Button>
        </form>
      </section>
      <SiteFooter />
    </div>
  );
}
