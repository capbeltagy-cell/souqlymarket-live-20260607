import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Eye, Loader2, Search, Send, X } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminCreateNotification,
  adminPhase2Action,
  adminPhase2Detail,
  adminPhase2List,
} from "@/lib/admin-phase2-ui.functions";

export type AdminModule = "orders" | "disputes" | "moderation" | "notifications" | "listings";
type Row = Record<string, unknown>;

const config: Record<AdminModule, { title: string; description: string; statuses: string[] }> = {
  orders: {
    title: "إدارة الطلبات",
    description: "متابعة الطلبات والحالات والنزاعات وسجل العمليات.",
    statuses: ["", "unpaid", "pending_approval", "pending_review", "held", "paid", "refunded"],
  },
  disputes: {
    title: "إدارة النزاعات",
    description: "فحص الأدلة والملاحظات والتعيين والقرارات.",
    statuses: [
      "",
      "open",
      "under_review",
      "waiting_for_buyer",
      "waiting_for_seller",
      "resolved_buyer",
      "resolved_seller",
      "rejected",
      "closed",
    ],
  },
  moderation: {
    title: "الإشراف والبلاغات",
    description: "مراجعة البلاغات واتخاذ إجراءات قابلة للتدقيق.",
    statuses: [
      "",
      "open",
      "investigating",
      "waiting_for_info",
      "resolved",
      "rejected",
      "escalated",
    ],
  },
  notifications: {
    title: "إشعارات المنصة",
    description: "إشعارات مباشرة ومجدولة وقوالب وسجل تسليم.",
    statuses: ["", "draft", "scheduled", "processing", "sent", "failed", "cancelled"],
  },
  listings: {
    title: "إدارة الإعلانات",
    description: "بحث ومراجعة حالة الإعلانات وسجل قراراتها.",
    statuses: ["", "draft", "pending_review", "published", "rejected", "suspended"],
  },
};

const labels: Record<string, string> = {
  id: "المعرّف",
  status: "الحالة",
  payment_status: "الدفع",
  created_at: "الإنشاء",
  updated_at: "آخر تحديث",
  title_ar: "العنوان",
  title: "العنوان",
  reason: "السبب",
  total_amount: "الإجمالي",
  buyer_id: "المشتري",
  order_id: "الطلب",
  entity_type: "النوع",
  target_kind: "الجمهور",
  scheduled_at: "موعد الإرسال",
};

function show(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  return String(value);
}

export function AdminPhase2ModulePage({ module }: { module: AdminModule }) {
  const meta = config[module];
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ record: Row; related: Record<string, unknown[]> } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const result = await adminPhase2List({
        data: { module, page, pageSize: 20, search, status },
      });
      setRows(result.rows as Row[]);
      setTotal(result.total);
      setMessage(result.available ? null : result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [module, page, status]);

  async function open(id: string) {
    setSelected(id);
    setDetail(null);
    try {
      const result = await adminPhase2Detail({ data: { module, id } });
      if (!result.available || !result.record) setMessage(result.message);
      else setDetail({ record: result.record as Row, related: result.related });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحميل التفاصيل");
    }
  }

  async function act(action: string, value?: string, assignee?: string) {
    if (!selected) return;
    try {
      const result = await adminPhase2Action({
        data: { module, id: selected, action, value, assignee },
      });
      if (!result.available) setMessage(result.message);
      else {
        toast.success("تم تنفيذ الإجراء وتسجيله");
        await open(selected);
        await load();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تنفيذ الإجراء");
    }
  }

  const columns = useMemo(() => {
    const preferred = [
      "id",
      "title_ar",
      "title",
      "status",
      "payment_status",
      "total_amount",
      "reason",
      "entity_type",
      "target_kind",
      "scheduled_at",
      "created_at",
    ];
    return preferred.filter((key) => rows.some((row) => key in row)).slice(0, 6);
  }, [rows]);

  return (
    <AdminLayout
      title={meta.title}
      description={meta.description}
      breadcrumbs={[{ label: meta.title }]}
      loading={loading && rows.length === 0}
    >
      <div className="space-y-5">
        {module === "notifications" && (
          <NotificationComposer onCreated={load} onUnavailable={setMessage} />
        )}
        {message && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 font-medium text-amber-900">
            {message}
          </div>
        )}
        <form
          className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            void load();
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="ps-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالمعرّف أو العنوان"
            />
          </div>
          <select
            className="h-10 rounded-md border bg-background px-3"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {meta.statuses.map((value) => (
              <option key={value || "all"} value={value}>
                {value || "كل الحالات"}
              </option>
            ))}
          </select>
          <Button type="submit">بحث</Button>
        </form>
        {!loading && !message && rows.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-12 text-center text-muted-foreground">
            لا توجد بيانات مطابقة.
          </div>
        ) : (
          rows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    {columns.map((key) => (
                      <th key={key} className="px-4 py-3 text-start">
                        {labels[key] ?? key}
                      </th>
                    ))}
                    <th className="px-4 py-3">التفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={String(row.id)} className="border-t">
                      {columns.map((key) => (
                        <td key={key} className="max-w-64 truncate px-4 py-3">
                          {key.includes("status") ? (
                            <Badge variant="outline">{show(row[key])}</Badge>
                          ) : (
                            show(row[key])
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void open(String(row.id))}
                        >
                          <Eye className="me-1 h-4 w-4" />
                          فتح
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        <div className="flex items-center justify-between text-sm">
          <span>{total} سجل</span>
          <div className="flex gap-2">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              السابق
            </Button>
            <Button
              variant="outline"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              التالي
            </Button>
          </div>
        </div>
      </div>
      {selected && (
        <DetailDrawer
          module={module}
          detail={detail}
          close={() => {
            setSelected(null);
            setDetail(null);
          }}
          act={act}
        />
      )}
    </AdminLayout>
  );
}

function DetailDrawer({
  module,
  detail,
  close,
  act,
}: {
  module: AdminModule;
  detail: { record: Row; related: Record<string, unknown[]> } | null;
  close: () => void;
  act: (action: string, value?: string, assignee?: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [assignee, setAssignee] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-foreground/40" onClick={close}>
      <aside
        dir="rtl"
        className="ms-auto h-full w-full max-w-2xl overflow-y-auto bg-background p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">التفاصيل والسجل</h2>
          <Button variant="ghost" size="icon" onClick={close}>
            <X />
          </Button>
        </div>
        {!detail ? (
          <Loader2 className="mx-auto mt-24 animate-spin" />
        ) : (
          <div className="space-y-5">
            <section className="grid gap-2 sm:grid-cols-2">
              {Object.entries(detail.record).map(([key, value]) => (
                <div key={key} className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{labels[key] ?? key}</div>
                  <pre className="mt-1 whitespace-pre-wrap break-all font-sans text-sm">
                    {show(value)}
                  </pre>
                </div>
              ))}
            </section>
            <Actions
              module={module}
              note={note}
              setNote={setNote}
              assignee={assignee}
              setAssignee={setAssignee}
              act={act}
            />
            <section>
              <h3 className="mb-2 font-semibold">السجل المرتبط</h3>
              {Object.entries(detail.related).map(([key, values]) => (
                <div key={key} className="mb-3 rounded-lg border p-3">
                  <div className="mb-2 font-medium">
                    {key} ({values.length})
                  </div>
                  {values.length === 0 ? (
                    <p className="text-sm text-muted-foreground">لا توجد سجلات.</p>
                  ) : (
                    values.map((value, index) => (
                      <pre
                        key={index}
                        className="mb-2 overflow-x-auto rounded bg-muted p-2 text-xs"
                      >
                        {show(value)}
                      </pre>
                    ))
                  )}
                </div>
              ))}
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}

function Actions({
  module,
  note,
  setNote,
  assignee,
  setAssignee,
  act,
}: {
  module: AdminModule;
  note: string;
  setNote: (v: string) => void;
  assignee: string;
  setAssignee: (v: string) => void;
  act: (a: string, v?: string, u?: string) => Promise<void>;
}) {
  const actions =
    module === "orders"
      ? [
          "new",
          "awaiting_seller",
          "accepted",
          "rejected",
          "packed",
          "paid",
          "shipped",
          "delivered",
          "completed",
          "cancelled",
          "returned",
          "fulfilled",
          "refunded",
        ]
      : module === "disputes"
        ? [
            "under_review",
            "waiting_for_buyer",
            "waiting_for_seller",
            "resolved_buyer",
            "resolved_seller",
            "rejected",
            "closed",
          ]
        : module === "moderation"
          ? ["investigating", "waiting_for_info", "resolved", "rejected", "escalated"]
          : module === "listings"
            ? ["published", "rejected", "suspended", "draft"]
            : [];
  const entityActions =
    module === "moderation" ? ["hide_entity", "suspend_entity", "restore_entity"] : [];
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <h3 className="font-semibold">الإجراءات</h3>
      <div className="flex flex-wrap gap-2">
        {[...actions, ...entityActions].map((a) => (
          <Button
            key={a}
            size="sm"
            variant="outline"
            onClick={() => void act(a, note || undefined)}
          >
            {a}
          </Button>
        ))}
      </div>
      {(module === "disputes" || module === "moderation") && (
        <>
          <div className="flex gap-2">
            <Input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="UUID المسؤول"
            />
            <Button disabled={!assignee} onClick={() => void act("assign", undefined, assignee)}>
              تعيين
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ملاحظة داخلية أو سبب القرار"
            />
            <Button disabled={!note.trim()} onClick={() => void act("note", note)}>
              إضافة ملاحظة
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function NotificationComposer({
  onCreated,
  onUnavailable,
}: {
  onCreated: () => Promise<void>;
  onUnavailable: (m: string | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetKind, setTargetKind] = useState<"user" | "company" | "store" | "role" | "broadcast">(
    "user",
  );
  const [target, setTarget] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [template, setTemplate] = useState("");
  const [preview, setPreview] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    const result = await adminCreateNotification({
      data: {
        title,
        message,
        targetKind,
        targetId: ["user", "company", "store"].includes(targetKind)
          ? target || undefined
          : undefined,
        targetRole: targetKind === "role" ? target : undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        templateName: template || undefined,
      },
    });
    if (!result.available) onUnavailable(result.message);
    else {
      toast.success("تم إنشاء الإشعار");
      setTitle("");
      setMessage("");
      await onCreated();
    }
  }
  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="font-bold">إنشاء إشعار</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان الإشعار"
        />
        <select
          className="h-10 rounded-md border bg-background px-3"
          value={targetKind}
          onChange={(e) => setTargetKind(e.target.value as typeof targetKind)}
        >
          <option value="user">مستخدم</option>
          <option value="company">شركة</option>
          <option value="store">متجر</option>
          <option value="role">حسب الدور</option>
          <option value="broadcast">إرسال عام</option>
        </select>
        <Input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          disabled={targetKind === "broadcast"}
          placeholder="UUID أو اسم الدور"
        />
        <Input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
        <Input
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder="حفظ كقالب (اختياري)"
        />
      </div>
      <textarea
        required
        className="min-h-28 w-full rounded-md border bg-background p-3"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="نص الإشعار"
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => setPreview((v) => !v)}>
          <Eye className="me-1 h-4 w-4" />
          معاينة
        </Button>
        <Button type="submit">
          <Send className="me-1 h-4 w-4" />
          إنشاء
        </Button>
      </div>
      {preview && (
        <div className="rounded-xl border bg-muted p-4">
          <div className="font-bold">{title || "عنوان الإشعار"}</div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{message || "نص الإشعار"}</p>
        </div>
      )}
    </form>
  );
}
