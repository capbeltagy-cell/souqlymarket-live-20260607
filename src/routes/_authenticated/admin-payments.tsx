import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Save, CheckCircle2, XCircle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  listAllPaymentMethods,
  upsertPaymentMethod,
  listPendingProofs,
  reviewPaymentProof,
} from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/admin-payments")({
  head: () => ({ meta: [{ title: "الدفع — لوحة الإدارة — Souqly" }] }),
  component: AdminPayments,
});

function AdminPayments() {
  const loadMethods = useServerFn(listAllPaymentMethods);
  const save = useServerFn(upsertPaymentMethod);
  const loadPending = useServerFn(listPendingProofs);
  const review = useServerFn(reviewPaymentProof);
  const [methods, setMethods] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  const refresh = async () => {
    try {
      const m = await loadMethods();
      setMethods((m as any).items);
      const p = await loadPending();
      setPending((p as any).items);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  useEffect(() => {
    refresh(); /* eslint-disable-next-line */
  }, []);

  const update = (id: string, patch: Partial<any>) =>
    setMethods(methods.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const saveMethod = async (m: any) => {
    try {
      await save({
        data: {
          id: m.id,
          code: m.code,
          name_ar: m.name_ar,
          name_en: m.name_en,
          instructions_ar: m.instructions_ar,
          instructions_en: m.instructions_en,
          account_details:
            typeof m.account_details === "string"
              ? JSON.parse(m.account_details || "{}")
              : m.account_details || {},
          icon: m.icon,
          is_active: !!m.is_active,
          sort_order: Number(m.sort_order || 0),
        },
      });
      toast.success("تم الحفظ");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const doReview = async (id: string, action: "approve" | "reject") => {
    try {
      await review({ data: { id, action, review_note: reviewNote[id] || null } });
      toast.success("تم");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-8 flex-1">
        <h1 className="text-2xl font-bold mb-6">إدارة المدفوعات</h1>
        <Tabs defaultValue="methods">
          <TabsList>
            <TabsTrigger value="methods">طرق الدفع</TabsTrigger>
            <TabsTrigger value="review">مراجعة إثباتات ({pending.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="methods" className="space-y-4 mt-4">
            {methods.map((m) => (
              <div key={m.id} className="rounded-lg border border-border bg-card p-4 grid gap-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">
                    {m.icon} {m.name_ar}{" "}
                    <span className="text-xs text-muted-foreground">({m.code})</span>
                  </div>
                  <label className="text-sm flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!m.is_active}
                      onChange={(e) => update(m.id, { is_active: e.target.checked })}
                    />
                    نشط
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="الاسم بالعربية"
                    value={m.name_ar || ""}
                    onChange={(e) => update(m.id, { name_ar: e.target.value })}
                  />
                  <Input
                    placeholder="Name EN"
                    value={m.name_en || ""}
                    onChange={(e) => update(m.id, { name_en: e.target.value })}
                  />
                </div>
                <Textarea
                  placeholder="تعليمات الدفع"
                  value={m.instructions_ar || ""}
                  onChange={(e) => update(m.id, { instructions_ar: e.target.value })}
                />
                <Textarea
                  placeholder='بيانات الحساب — JSON مثال: {"رقم الهاتف":"01001234567","الاسم":"سوقلي"}'
                  value={
                    typeof m.account_details === "string"
                      ? m.account_details
                      : JSON.stringify(m.account_details || {}, null, 2)
                  }
                  onChange={(e) => update(m.id, { account_details: e.target.value })}
                  className="font-mono text-xs"
                  rows={4}
                />
                <div className="flex justify-end">
                  <Button onClick={() => saveMethod(m)} size="sm">
                    <Save className="h-4 w-4 me-1" /> حفظ
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="review" className="space-y-3 mt-4">
            {pending.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8">
                لا توجد إثباتات بانتظار المراجعة
              </div>
            )}
            {pending.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold">
                      {Number(p.amount).toLocaleString("ar-EG")} {p.currency} —{" "}
                      {p.payment_method_code}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      طلب:{" "}
                      <Link to="/orders/$id" params={{ id: p.order_id }} className="text-primary">
                        #{p.order_id.slice(0, 8)}
                      </Link>{" "}
                      • {new Date(p.created_at).toLocaleString("ar-EG")}
                    </div>
                    {p.reference && (
                      <div className="text-xs">
                        مرجع: <span className="font-mono">{p.reference}</span>
                      </div>
                    )}
                    {p.note && <div className="text-xs text-muted-foreground">{p.note}</div>}
                  </div>
                  {p.proof_url && (
                    <a
                      href={p.proof_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary"
                    >
                      عرض الإيصال
                    </a>
                  )}
                </div>
                <Input
                  placeholder="ملاحظة المراجعة (اختياري)"
                  value={reviewNote[p.id] || ""}
                  onChange={(e) => setReviewNote({ ...reviewNote, [p.id]: e.target.value })}
                  className="mb-2"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => doReview(p.id, "reject")}>
                    <XCircle className="h-4 w-4 me-1" /> رفض
                  </Button>
                  <Button
                    onClick={() => doReview(p.id, "approve")}
                    className="bg-success hover:opacity-90"
                  >
                    <CheckCircle2 className="h-4 w-4 me-1" /> اعتماد
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </section>
      <SiteFooter />
    </div>
  );
}
