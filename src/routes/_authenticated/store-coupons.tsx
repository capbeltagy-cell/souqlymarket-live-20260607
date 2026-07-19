import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2, Percent, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listMyStoreCoupons, saveStoreCoupon, deleteStoreCoupon } from "@/lib/store-coupons.functions";

export const Route = createFileRoute("/_authenticated/store-coupons")({ component: StoreCouponsPage });

type Coupon = { id: string; code: string; discount_type: "percentage" | "fixed"; discount_value: number; minimum_order_amount: number; usage_limit: number | null; used_count: number; is_active: boolean; ends_at: string | null };

function StoreCouponsPage() {
  const load = useServerFn(listMyStoreCoupons);
  const save = useServerFn(saveStoreCoupon);
  const remove = useServerFn(deleteStoreCoupon);
  const [rows, setRows] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: "", discount_type: "percentage" as "percentage" | "fixed", discount_value: 10, minimum_order_amount: 0, usage_limit: "", is_active: true });

  const reload = () => load().then((data) => setRows(data as Coupon[])).catch((e) => toast.error((e as Error).message)).finally(() => setLoading(false));
  useEffect(() => { reload(); }, []);

  async function submit() {
    if (!form.code.trim()) return toast.error("اكتب كود الخصم");
    setSaving(true);
    try {
      await save({ data: { code: form.code, discount_type: form.discount_type, discount_value: Number(form.discount_value), minimum_order_amount: Number(form.minimum_order_amount), usage_limit: form.usage_limit ? Number(form.usage_limit) : null, maximum_discount_amount: null, starts_at: null, ends_at: null, is_active: form.is_active } });
      setForm({ code: "", discount_type: "percentage", discount_value: 10, minimum_order_amount: 0, usage_limit: "", is_active: true });
      toast.success("تم إنشاء الكوبون");
      await reload();
    } catch (e) { toast.error((e as Error).message === "COUPON_CODE_TAKEN" ? "الكود مستخدم بالفعل" : (e as Error).message); }
    finally { setSaving(false); }
  }

  return <div className="min-h-screen flex flex-col bg-muted/20" dir="rtl">
    <SiteHeader />
    <main className="container-souqly py-8 flex-1 space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Percent className="h-6 w-6" /> كوبونات المتجر</h1><p className="text-sm text-muted-foreground mt-1">أنشئ أكواد خصم خاصة بمتجرك وحدد الحد الأدنى وعدد مرات الاستخدام.</p></div>
      <section className="rounded-xl border bg-card p-5 grid md:grid-cols-5 gap-4 items-end">
        <div><Label>الكود</Label><Input className="mt-1" dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" /></div>
        <div><Label>نوع الخصم</Label><select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as any })}><option value="percentage">نسبة مئوية</option><option value="fixed">مبلغ ثابت</option></select></div>
        <div><Label>قيمة الخصم</Label><Input className="mt-1" type="number" min="1" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} /></div>
        <div><Label>الحد الأدنى للطلب</Label><Input className="mt-1" type="number" min="0" value={form.minimum_order_amount} onChange={(e) => setForm({ ...form, minimum_order_amount: Number(e.target.value) })} /></div>
        <Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : <Plus className="h-4 w-4 ms-2" />} إضافة</Button>
      </section>
      <section className="rounded-xl border bg-card overflow-hidden">
        {loading ? <div className="py-16 flex justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div> : rows.length === 0 ? <div className="py-16 text-center text-muted-foreground">لا توجد كوبونات حتى الآن.</div> : <div className="divide-y">{rows.map((c) => <div key={c.id} className="p-4 flex flex-wrap items-center gap-4"><strong dir="ltr" className="text-lg">{c.code}</strong><span>{c.discount_type === "percentage" ? `${c.discount_value}%` : `${c.discount_value} ج.م`}</span><span className="text-sm text-muted-foreground">حد أدنى: {c.minimum_order_amount} ج.م</span><span className="text-sm text-muted-foreground">الاستخدام: {c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</span><span className={`text-xs rounded-full px-2 py-1 ${c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted"}`}>{c.is_active ? "نشط" : "متوقف"}</span><Button className="ms-auto" size="icon" variant="ghost" onClick={async () => { if (!confirm("حذف الكوبون؟")) return; await remove({ data: { id: c.id } }); await reload(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}</div>}
      </section>
    </main>
    <SiteFooter />
  </div>;
}
