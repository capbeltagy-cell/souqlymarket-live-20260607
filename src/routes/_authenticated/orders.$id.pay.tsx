import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload, CheckCircle2, Clock, XCircle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getOrder } from "@/lib/orders.functions";
import { listActivePaymentMethods, submitPaymentProof, listOrderProofs } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/orders/$id/pay")({
  head: ({ params }) => ({ meta: [{ title: `دفع الطلب #${params.id.slice(0, 8)} — Souqly` }] }),
  component: PayOrderPage,
});

function PayOrderPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const loadOrder = useServerFn(getOrder);
  const loadMethods = useServerFn(listActivePaymentMethods);
  const loadProofs = useServerFn(listOrderProofs);
  const submit = useServerFn(submitPaymentProof);
  const [order, setOrder] = useState<any>(null);
  const [methods, setMethods] = useState<any[]>([]);
  const [proofs, setProofs] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [amount, setAmount] = useState(0);
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [o, m, p] = await Promise.all([
      loadOrder({ data: { id } }),
      loadMethods(),
      loadProofs({ data: { order_id: id } }),
    ]);
    setOrder((o as any).order);
    setMethods((m as any).items);
    setProofs((p as any).items);
    if (!amount) setAmount(Number((o as any).order?.total_amount ?? 0));
  };
  useEffect(() => { refresh().catch((e) => toast.error(e.message)); /* eslint-disable-next-line */ }, [id]);

  const uploadProof = async (): Promise<string | null> => {
    if (!file || !user) return null;
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/proofs/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("listing-media").upload(path, file, { contentType: file.type });
    if (error) { toast.error(error.message); return null; }
    const { data, error: sErr } = await supabase.storage.from("listing-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    if (sErr) { toast.error(sErr.message); return null; }
    return data?.signedUrl ?? null;
  };

  const handleSubmit = async () => {
    if (!selected) { toast.error("اختر طريقة الدفع"); return; }
    if (amount <= 0) { toast.error("أدخل المبلغ"); return; }
    setBusy(true);
    try {
      let proofUrl: string | null = null;
      if (file) proofUrl = await uploadProof();
      await submit({ data: {
        order_id: id, payment_method_id: selected.id, amount, currency: order?.currency ?? "EGP",
        proof_url: proofUrl, reference: ref || null, note: note || null,
      }});
      toast.success("تم رفع إثبات الدفع — بانتظار المراجعة");
      setFile(null); setRef(""); setNote(""); setSelected(null);
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  if (!order) return <div className="min-h-screen flex flex-col"><SiteHeader /><div className="container-souqly py-8 flex-1 text-muted-foreground">جارٍ التحميل…</div><SiteFooter /></div>;

  const alreadyPaid = order.payment_status === "paid";

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-8 max-w-3xl mx-auto w-full flex-1">
        <Link to="/orders/$id" params={{ id }} className="text-sm text-muted-foreground mb-4 inline-block">← رجوع للطلب</Link>
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">دفع الطلب #{id.slice(0, 8)}</h1>
            <div className="text-2xl font-bold">{Number(order.total_amount).toLocaleString("ar-EG")} {order.currency}</div>
          </div>

          {alreadyPaid ? (
            <div className="rounded-md bg-success/10 border border-success/40 p-4 text-sm">
              <CheckCircle2 className="h-4 w-4 inline me-1 text-success" /> تم استلام الدفع لهذا الطلب — الأموال محفوظة لدى المنصة حتى تأكيد الاستلام.
            </div>
          ) : (
            <>
              <div>
                <div className="text-sm font-semibold mb-2">اختر طريقة الدفع</div>
                {methods.length === 0 ? (
                  <div className="text-sm text-muted-foreground border border-dashed border-border rounded-md p-4 text-center">لم يُفعّل الأدمن أي طرق دفع بعد</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {methods.map((m) => (
                      <button key={m.id} onClick={() => setSelected(m)}
                        className={`text-start p-3 rounded-lg border transition ${selected?.id === m.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                        <div className="text-lg">{m.icon} {m.name_ar}</div>
                        <div className="text-xs text-muted-foreground">{m.name_en}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selected && (
                <div className="rounded-lg border border-primary/50 bg-primary/5 p-4 space-y-3">
                  <div className="text-sm">{selected.instructions_ar}</div>
                  {Object.keys(selected.account_details || {}).length > 0 && (
                    <div className="rounded-md bg-background p-3 text-sm space-y-1">
                      {Object.entries(selected.account_details as Record<string, unknown>).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2"><span className="text-muted-foreground">{k}</span><span className="font-mono select-all">{String(v)}</span></div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-sm">المبلغ<Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></label>
                    <label className="text-sm">رقم المرجع / آخر أرقام<Input value={ref} onChange={(e) => setRef(e.target.value)} /></label>
                  </div>
                  <label className="block text-sm">
                    إثبات الدفع (صورة)
                    <div className="mt-1 flex items-center gap-2">
                      <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-md border border-border hover:bg-muted">
                        <Upload className="h-4 w-4" /> اختر ملف
                        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                      </label>
                      {file && <span className="text-xs text-muted-foreground truncate">{file.name}</span>}
                    </div>
                  </label>
                  <Textarea placeholder="ملاحظات (اختياري)" value={note} onChange={(e) => setNote(e.target.value)} />
                  <Button onClick={handleSubmit} disabled={busy} className="w-full bg-primary hover:bg-primary-hover">
                    إرسال للمراجعة
                  </Button>
                </div>
              )}
            </>
          )}

          {proofs.length > 0 && (
            <div className="border-t border-border pt-4">
              <div className="text-sm font-semibold mb-2">سجل عمليات الدفع</div>
              <div className="space-y-2">
                {proofs.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                    <div>
                      <div>{p.payment_method_code} — {Number(p.amount).toLocaleString("ar-EG")} {p.currency}</div>
                      <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("ar-EG")}{p.reference && ` • ${p.reference}`}</div>
                      {p.review_note && <div className="text-xs text-destructive">{p.review_note}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      {p.proof_url && <a href={p.proof_url} target="_blank" rel="noreferrer" className="text-xs text-primary">عرض</a>}
                      <Badge variant={p.status === "approved" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>
                        {p.status === "approved" ? <CheckCircle2 className="h-3 w-3 inline" /> : p.status === "rejected" ? <XCircle className="h-3 w-3 inline" /> : <Clock className="h-3 w-3 inline" />} {p.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
