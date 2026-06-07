import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";
import { getRfq, listRfqOffers, submitRfqOffer, awardRfq } from "@/lib/phase3.functions";

export const Route = createFileRoute("/rfq/$id")({
  notFoundComponent: () => <Fallback msg="RFQ not found" />,
  errorComponent: () => <Fallback msg="Something went wrong" />,
  component: RfqDetail,
});

function RfqDetail() {
  const { id } = Route.useParams();
  const { locale } = useI18n();
  const { user } = useAuth();
  const ar = locale === "ar";
  const [rfq, setRfq] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    const r = await getRfq({ data: { id } });
    setRfq(r.rfq);
    if (user) {
      try { const o = await listRfqOffers({ data: { rfqId: id } }); setOffers(o.offers); } catch { /* not allowed */ }
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id, user?.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await submitRfqOffer({ data: { rfqId: id, price: Number(price), lead_time_days: days ? Number(days) : undefined, notes: notes || undefined } });
      toast.success(ar ? "تم إرسال العرض" : "Offer submitted");
      setPrice(""); setDays(""); setNotes("");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function pickWinner(offerId: string) {
    try {
      await awardRfq({ data: { rfqId: id, offerId } });
      toast.success(ar ? "تم اختيار الفائز" : "Winner selected");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  if (!rfq) return <div className="p-10 text-center text-muted-foreground">…</div>;
  const isBuyer = user?.id === rfq.buyer_id;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{rfq.title}</h1>
            <Badge>{rfq.status}</Badge>
          </div>
          <p className="text-muted-foreground whitespace-pre-wrap">{rfq.description}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Cell label={ar ? "القسم" : "Category"} value={rfq.category_slug} />
            <Cell label={ar ? "المحافظة" : "Governorate"} value={rfq.governorate} />
            <Cell label={ar ? "الكمية" : "Quantity"} value={rfq.quantity ? `${rfq.quantity} ${rfq.unit ?? ""}` : null} />
            <Cell label={ar ? "الميزانية" : "Budget"} value={(rfq.budget_min || rfq.budget_max) ? `${rfq.budget_min ?? "?"}–${rfq.budget_max ?? "?"} ${rfq.currency}` : null} />
          </div>

          <h2 className="text-xl font-semibold mt-6">{ar ? "العروض المقدمة" : "Submitted Offers"}</h2>
          {offers.length === 0 ? (
            <div className="text-muted-foreground text-sm">{user ? (ar ? "لا توجد عروض بعد" : "No offers yet") : (ar ? "سجّل الدخول لعرض العروض" : "Sign in to view offers")}</div>
          ) : offers.map((o) => (
            <div key={o.id} className="rounded-lg border border-border bg-card p-4 shadow-card">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold">{ar ? o.companies?.name_ar : o.companies?.name_en} {o.companies?.is_verified && <span className="text-xs text-primary">✓</span>}</div>
                  <div className="text-sm text-muted-foreground">{ar ? "السعر" : "Price"}: {o.price} {o.currency} · {ar ? "مدة التسليم" : "Lead time"}: {o.lead_time_days ?? "—"} {ar ? "يوم" : "d"}</div>
                  {o.notes && <p className="text-sm mt-1">{o.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={o.status === "accepted" ? "default" : "secondary"}>{o.status}</Badge>
                  {isBuyer && rfq.status === "open" && (
                    <Button size="sm" onClick={() => pickWinner(o.id)} className="bg-primary hover:bg-primary-hover">{ar ? "اختر الفائز" : "Award"}</Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="space-y-4">
          {rfq.status === "open" && user && !isBuyer && (
            <form onSubmit={submit} className="rounded-lg border border-border bg-card p-5 shadow-card space-y-3">
              <h3 className="font-semibold">{ar ? "قدّم عرضك" : "Submit your offer"}</h3>
              <Input type="number" min="0" step="0.01" required placeholder={ar ? "السعر (ج.م)" : "Price (EGP)"} value={price} onChange={(e) => setPrice(e.target.value)} />
              <Input type="number" min="0" placeholder={ar ? "مدة التسليم (أيام)" : "Lead time (days)"} value={days} onChange={(e) => setDays(e.target.value)} />
              <Textarea rows={3} placeholder={ar ? "ملاحظات" : "Notes"} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Button type="submit" className="w-full bg-primary hover:bg-primary-hover">{ar ? "إرسال العرض" : "Submit"}</Button>
            </form>
          )}
        </aside>
      </section>
      <SiteFooter />
    </div>
  );
}

function Cell({ label, value }: { label: string; value: any }) {
  return <div className="rounded border border-border bg-card p-2"><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{value ?? "—"}</div></div>;
}
