import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, XCircle, FileText } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getQuotation, respondToQuotation } from "@/lib/quotations.functions";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/quotations/$id")({
  head: ({ params }) => ({ meta: [{ title: `عرض سعر #${params.id.slice(0, 8)} — Souqly` }] }),
  component: QuotationDetail,
});

function QuotationDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const load = useServerFn(getQuotation);
  const respond = useServerFn(respondToQuotation);
  const [data, setData] = useState<{ quotation: any; items: any[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [addr, setAddr] = useState({ recipient_name: "", phone: "", governorate: "", city: "", address_line: "" });

  useEffect(() => { load({ data: { id } }).then((r) => setData(r as any)).catch((e) => toast.error(e.message)); }, [id, load]);

  if (!data) return <div className="min-h-screen flex flex-col"><SiteHeader /><div className="container-souqly py-8 flex-1 text-muted-foreground">جارٍ التحميل…</div><SiteFooter /></div>;
  const { quotation: q, items } = data;
  const isBuyer = q.buyer_id === user?.id;
  const canRespond = isBuyer && ["sent", "draft"].includes(q.status);

  const act = async (action: "accept" | "reject") => {
    if (action === "accept" && (!addr.recipient_name || !addr.phone || !addr.city)) {
      toast.error("أدخل عنوان الشحن");
      return;
    }
    setBusy(true);
    try {
      const res = await respond({ data: { id, action, shipping_address: action === "accept" ? addr : null } });
      toast.success(action === "accept" ? "تم القبول وإنشاء الطلب" : "تم الرفض");
      if ((res as any).order_id) navigate({ to: "/orders/$id", params: { id: (res as any).order_id } });
      else load({ data: { id } }).then((r) => setData(r as any));
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-8 max-w-3xl mx-auto w-full flex-1">
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold">عرض سعر #{q.id.slice(0, 8)}</h1>
              </div>
              <div className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleString("ar-EG")}</div>
            </div>
            <Badge>{q.status}</Badge>
          </div>

          <div className="space-y-2 mb-6">
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between border-b border-border py-2">
                <div>
                  <div className="font-medium">{it.title}</div>
                  <div className="text-xs text-muted-foreground">{it.quantity} × {Number(it.unit_price).toLocaleString("ar-EG")} {q.currency}{Number(it.discount) > 0 && ` - خصم ${it.discount}`}</div>
                </div>
                <div className="font-semibold">{Number(it.total).toLocaleString("ar-EG")} {q.currency}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-muted p-4 mb-4 space-y-1 text-sm">
            <div className="flex justify-between"><span>المجموع الفرعي</span><span>{Number(q.subtotal).toLocaleString("ar-EG")} {q.currency}</span></div>
            {Number(q.discount) > 0 && <div className="flex justify-between text-destructive"><span>خصم</span><span>-{Number(q.discount).toLocaleString("ar-EG")}</span></div>}
            {Number(q.tax) > 0 && <div className="flex justify-between"><span>ضريبة</span><span>+{Number(q.tax).toLocaleString("ar-EG")}</span></div>}
            {Number(q.shipping) > 0 && <div className="flex justify-between"><span>شحن</span><span>+{Number(q.shipping).toLocaleString("ar-EG")}</span></div>}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-border"><span>الإجمالي</span><span>{Number(q.total).toLocaleString("ar-EG")} {q.currency}</span></div>
          </div>

          {q.expiry_date && <div className="text-sm text-muted-foreground mb-2">صالح حتى: {q.expiry_date}</div>}
          {q.notes && <div className="rounded-md border border-border p-3 mb-4 text-sm bg-background/50">{q.notes}</div>}

          {q.status === "converted" && q.order_id && (
            <Button asChild className="w-full"><Link to="/orders/$id" params={{ id: q.order_id }}>عرض الطلب →</Link></Button>
          )}

          {canRespond && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border p-3 bg-background/50">
                <div className="text-sm font-semibold mb-2">عنوان الشحن</div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="الاسم" value={addr.recipient_name} onChange={(e) => setAddr({ ...addr, recipient_name: e.target.value })} />
                  <Input placeholder="الهاتف" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} />
                  <Input placeholder="المحافظة" value={addr.governorate} onChange={(e) => setAddr({ ...addr, governorate: e.target.value })} />
                  <Input placeholder="المدينة" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
                </div>
                <Input className="mt-2" placeholder="العنوان بالتفصيل" value={addr.address_line} onChange={(e) => setAddr({ ...addr, address_line: e.target.value })} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => act("reject")} disabled={busy}><XCircle className="h-4 w-4 me-2" /> رفض</Button>
                <Button onClick={() => act("accept")} disabled={busy} className="bg-success hover:opacity-90">
                  <CheckCircle2 className="h-4 w-4 me-2" /> قبول وإنشاء طلب
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
