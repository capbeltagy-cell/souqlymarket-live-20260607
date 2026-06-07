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
import { getTender, listTenderProposals, submitTenderProposal, awardTender } from "@/lib/phase3.functions";

export const Route = createFileRoute("/tenders/$id")({
  notFoundComponent: () => <Fallback msg="Tender not found" />,
  errorComponent: () => <Fallback msg="Something went wrong" />,
  component: TenderDetail,
});

function TenderDetail() {
  const { id } = Route.useParams();
  const { locale } = useI18n();
  const { user } = useAuth();
  const ar = locale === "ar";
  const [tender, setTender] = useState<any>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    const r = await getTender({ data: { id } });
    setTender(r.tender);
    if (user) {
      try { const p = await listTenderProposals({ data: { tenderId: id } }); setProposals(p.proposals); } catch { /* not allowed */ }
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id, user?.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await submitTenderProposal({ data: { tenderId: id, price: Number(price), timeline_days: days ? Number(days) : undefined, notes: notes || undefined } });
      toast.success(ar ? "تم إرسال العرض" : "Proposal submitted");
      setPrice(""); setDays(""); setNotes("");
      load();
    } catch (e: any) { toast.error(e.message); }
  }
  async function award(pid: string) {
    try { await awardTender({ data: { tenderId: id, proposalId: pid } }); toast.success(ar ? "تم الترسية" : "Awarded"); load(); }
    catch (e: any) { toast.error(e.message); }
  }
  if (!tender) return <div className="p-10 text-center">…</div>;
  const isPublisher = user?.id === tender.publisher_id;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{tender.title}</h1>
            <Badge>{tender.status}</Badge>
          </div>
          <p className="text-muted-foreground whitespace-pre-wrap">{tender.description}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Cell label={ar ? "القسم" : "Category"} value={tender.category_slug} />
            <Cell label={ar ? "المحافظة" : "Governorate"} value={tender.governorate} />
            <Cell label={ar ? "الميزانية" : "Budget"} value={tender.budget ? `${tender.budget} ${tender.currency}` : null} />
            <Cell label={ar ? "الموعد النهائي" : "Deadline"} value={tender.deadline} />
          </div>
          <h2 className="text-xl font-semibold mt-6">{ar ? "العروض المقدمة" : "Proposals"}</h2>
          {proposals.length === 0 ? <div className="text-muted-foreground text-sm">{user ? (ar ? "لا توجد عروض" : "No proposals") : (ar ? "سجّل الدخول لعرض العروض" : "Sign in to view proposals")}</div> :
            proposals.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-card p-4 shadow-card flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold">{ar ? p.companies?.name_ar : p.companies?.name_en} {p.companies?.is_verified && <span className="text-xs text-primary">✓</span>}</div>
                  <div className="text-sm text-muted-foreground">{p.price} {p.currency} · {p.timeline_days ?? "—"} {ar ? "يوم" : "days"}</div>
                  {p.notes && <p className="text-sm mt-1">{p.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.status === "accepted" ? "default" : "secondary"}>{p.status}</Badge>
                  {isPublisher && tender.status === "open" && <Button size="sm" onClick={() => award(p.id)} className="bg-primary hover:bg-primary-hover">{ar ? "ترسية" : "Award"}</Button>}
                </div>
              </div>
            ))}
        </div>
        <aside>
          {tender.status === "open" && user && !isPublisher && (
            <form onSubmit={submit} className="rounded-lg border border-border bg-card p-5 shadow-card space-y-3">
              <h3 className="font-semibold">{ar ? "قدّم عرضك" : "Submit proposal"}</h3>
              <Input type="number" min="0" step="0.01" required placeholder={ar ? "السعر (ج.م)" : "Price (EGP)"} value={price} onChange={(e) => setPrice(e.target.value)} />
              <Input type="number" min="0" placeholder={ar ? "مدة التنفيذ (أيام)" : "Timeline (days)"} value={days} onChange={(e) => setDays(e.target.value)} />
              <Textarea rows={3} placeholder={ar ? "ملاحظات" : "Notes"} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Button type="submit" className="w-full bg-primary hover:bg-primary-hover">{ar ? "إرسال" : "Submit"}</Button>
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


function Fallback({ msg }: { msg: string }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 grid place-items-center p-10 text-center text-muted-foreground">{msg}</div>
      <SiteFooter />
    </div>
  );
}
