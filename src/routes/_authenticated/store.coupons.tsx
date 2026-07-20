import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMyStore } from "@/lib/stores.functions";
import { listCoupons, upsertCoupon, deleteCoupon } from "@/lib/store-coupons.functions";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/store/coupons")({
  head: () => ({ meta: [{ title: "كوبونات المتجر — سوقلي" }] }),
  component: StoreCouponsPage,
});

function StoreCouponsPage() {
  const navigate = useNavigate();
  const [store, setStore] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    code: "",
    type: "percent" as "percent" | "fixed",
    value: 10,
    min_order: 0,
    usage_limit_per_user: 1,
    active: true,
  });

  async function reload(storeId: string) {
    const r = await listCoupons({ data: { store_id: storeId } });
    setItems(r.items);
  }

  useEffect(() => {
    getMyStore().then(async (r) => {
      if (!r.store) { navigate({ to: "/store" }); return; }
      setStore(r.store);
      await reload(r.store.id);
      setLoading(false);
    });
  }, [navigate]);

  async function save() {
    try {
      await upsertCoupon({ data: { ...form, store_id: store.id } });
      toast.success("تم الحفظ");
      setForm({ ...form, code: "" });
      await reload(store.id);
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string) {
    if (!confirm("حذف الكوبون؟")) return;
    try {
      await deleteCoupon({ data: { id, store_id: store.id } });
      toast.success("تم الحذف");
      await reload(store.id);
    } catch (e: any) { toast.error(e.message); }
  }

  if (loading) return <div className="min-h-screen"><SiteHeader /><div className="container-souqly py-12 text-center">…</div></div>;

  return (
    <div className="min-h-screen bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-6 max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold">كوبونات الخصم</h1>

        <div className="rounded-xl bg-card border border-border p-5 space-y-3">
          <h2 className="font-semibold">إضافة كوبون</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label>الكود</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE10" /></div>
            <div>
              <Label>النوع</Label>
              <select className="w-full h-10 rounded-md border border-input px-3" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
                <option value="percent">نسبة %</option>
                <option value="fixed">مبلغ ثابت</option>
              </select>
            </div>
            <div><Label>القيمة</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></div>
            <div><Label>حد أدنى للطلب</Label><Input type="number" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: Number(e.target.value) })} /></div>
          </div>
          <Button onClick={save} disabled={!form.code || form.value <= 0}><Plus className="h-4 w-4 me-1" />إضافة</Button>
        </div>

        <div className="rounded-xl bg-card border border-border">
          {items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">لا توجد كوبونات</div>
          ) : (
            <div className="divide-y">
              {items.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-mono font-bold">{c.code}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.type === "percent" ? `${c.value}%` : `${c.value} ج.م`}
                      {c.min_order > 0 && ` • حد أدنى ${c.min_order}`}
                      {" • "}استخدم {c.used_count ?? 0}{c.usage_limit_total ? `/${c.usage_limit_total}` : ""}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
