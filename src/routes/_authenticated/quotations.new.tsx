import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMarketerGuard } from "@/hooks/useMarketerGuard";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, Send } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { createQuotation } from "@/lib/quotations.functions";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({ c: z.string().uuid() });

export const Route = createFileRoute("/_authenticated/quotations/new")({
  head: () => ({ meta: [{ title: "إنشاء عرض سعر — Souqly" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: NewQuotationPage,
});

type Item = { title: string; quantity: number; unit_price: number; discount: number; listing_id?: string | null };

function NewQuotationPage() {
  useMarketerGuard();
  const { c: conversationId } = Route.useSearch();
  const navigate = useNavigate();
  const create = useServerFn(createQuotation);
  const [items, setItems] = useState<Item[]>([{ title: "", quantity: 1, unit_price: 0, discount: 0 }]);
  const [currency, setCurrency] = useState("EGP");
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [expiry, setExpiry] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  // Prefill first item from conversation's listing
  useEffect(() => {
    (async () => {
      const { data: conv } = await (supabase.from("conversations" as never) as any)
        .select("listing_id").eq("id", conversationId).maybeSingle();
      if (conv?.listing_id) {
        const { data: l } = await supabase.from("listings")
          .select("id, title_ar, title_en, price, currency").eq("id", conv.listing_id).maybeSingle();
        if (l) {
          setCurrency(l.currency ?? "EGP");
          setItems([{ title: l.title_ar ?? l.title_en ?? "", quantity: 1, unit_price: Number(l.price ?? 0), discount: 0, listing_id: l.id }]);
        }
      }
    })();
  }, [conversationId]);

  const subtotal = items.reduce((s, i) => s + Math.max(0, i.quantity * i.unit_price - (i.discount || 0)), 0);
  const total = Math.max(0, subtotal - discount + tax + shipping);

  const submit = async (send: boolean) => {
    if (items.some((i) => !i.title.trim() || i.quantity <= 0 || i.unit_price < 0)) {
      toast.error("راجع بيانات المنتجات");
      return;
    }
    setBusy(true);
    try {
      const res = await create({ data: {
        conversation_id: conversationId, currency,
        items: items.map((i) => ({ title: i.title.trim(), quantity: Number(i.quantity), unit_price: Number(i.unit_price), discount: Number(i.discount || 0), listing_id: i.listing_id ?? null })),
        discount: Number(discount), tax: Number(tax), shipping: Number(shipping),
        expiry_date: expiry || null, notes: notes || null, send,
      }});
      toast.success(send ? "تم إرسال العرض" : "تم الحفظ كمسودة");
      navigate({ to: "/quotations/$id", params: { id: res.id } });
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-8 max-w-3xl mx-auto w-full flex-1">
        <h1 className="text-2xl font-bold mb-6">إنشاء عرض سعر احترافي</h1>
        <div className="space-y-4">
          {items.map((it, idx) => (
            <div key={idx} className="rounded-lg border border-border p-4 bg-card grid gap-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">منتج {idx + 1}</div>
                {items.length > 1 && (
                  <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
              <Input placeholder="اسم المنتج / الوصف" value={it.title} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, title: e.target.value } : x))} />
              <div className="grid grid-cols-3 gap-2">
                <Input type="number" min={1} placeholder="الكمية" value={it.quantity} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) } : x))} />
                <Input type="number" min={0} placeholder="سعر الوحدة" value={it.unit_price} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, unit_price: Number(e.target.value) } : x))} />
                <Input type="number" min={0} placeholder="خصم" value={it.discount} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, discount: Number(e.target.value) } : x))} />
              </div>
              <div className="text-xs text-muted-foreground text-end">إجمالي البند: {Math.max(0, it.quantity * it.unit_price - it.discount).toLocaleString("ar-EG")} {currency}</div>
            </div>
          ))}
          <Button variant="outline" onClick={() => setItems([...items, { title: "", quantity: 1, unit_price: 0, discount: 0 }])}>
            <Plus className="h-4 w-4 me-2" /> إضافة منتج
          </Button>

          <div className="rounded-lg border border-border p-4 bg-card grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">العملة<Input value={currency} onChange={(e) => setCurrency(e.target.value)} /></label>
              <label className="text-sm">صلاحية العرض<Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="text-sm">خصم عام<Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></label>
              <label className="text-sm">ضريبة<Input type="number" value={tax} onChange={(e) => setTax(Number(e.target.value))} /></label>
              <label className="text-sm">شحن<Input type="number" value={shipping} onChange={(e) => setShipping(Number(e.target.value))} /></label>
            </div>
            <Textarea placeholder="ملاحظات / شروط" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <div>المجموع الفرعي: {subtotal.toLocaleString("ar-EG")} {currency}</div>
              <div>خصم: -{discount.toLocaleString("ar-EG")} | ضريبة: +{tax.toLocaleString("ar-EG")} | شحن: +{shipping.toLocaleString("ar-EG")}</div>
            </div>
            <div className="text-2xl font-bold">{total.toLocaleString("ar-EG")} {currency}</div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => submit(false)} disabled={busy}>حفظ كمسودة</Button>
            <Button onClick={() => submit(true)} disabled={busy} className="bg-primary hover:bg-primary-hover">
              <Send className="h-4 w-4 me-2" /> إرسال للمشتري
            </Button>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
