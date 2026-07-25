import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Loader2, MessageCircle, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdminRoute } from "@/lib/route-guards";
import {
  createCompanyProspect,
  listCompanyProspects,
  updateCompanyProspectStatus,
} from "@/lib/company-prospects.functions";

export const Route = createFileRoute("/_authenticated/admin-company-prospects")({
  beforeLoad: requireAdminRoute,
  head: () => ({ meta: [{ title: "قاعدة الشركات والتواصل — سوقلي" }] }),
  component: CompanyProspectsPage,
});

type Row = Awaited<ReturnType<typeof listCompanyProspects>>[number];
type Status = Row["contact_status"];

const statuses: Array<{ value: Status; label: string }> = [
  { value: "new", label: "جديد" },
  { value: "not_contacted", label: "لم يتم التواصل" },
  { value: "whatsapp_sent", label: "تم إرسال واتساب" },
  { value: "email_sent", label: "تم إرسال بريد" },
  { value: "called", label: "تم الاتصال" },
  { value: "interested", label: "مهتم" },
  { value: "follow_up", label: "متابعة" },
  { value: "joined", label: "انضم لسوقلي" },
  { value: "rejected", label: "رفض" },
  { value: "invalid", label: "بيانات غير صحيحة" },
];

function CompanyProspectsPage() {
  const list = useServerFn(listCompanyProspects);
  const create = useServerFn(createCompanyProspect);
  const changeStatus = useServerFn(updateCompanyProspectStatus);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await list({ data: { limit: 300 } });
      setRows(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحميل الشركات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => void load(), []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const statusOk = filter === "all" || row.contact_status === filter;
      const searchOk =
        !q ||
        [row.name_ar, row.name_en, row.industry, row.city, row.phone]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      return statusOk && searchOk;
    });
  }, [rows, search, filter]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await create({
        data: {
          name_ar: String(form.get("name_ar") || ""),
          name_en: String(form.get("name_en") || "") || null,
          industry: String(form.get("industry") || "") || null,
          governorate: String(form.get("governorate") || "") || null,
          city: String(form.get("city") || "") || null,
          website: String(form.get("website") || "") || null,
          email: String(form.get("email") || "") || null,
          phone: String(form.get("phone") || "") || null,
          whatsapp: String(form.get("whatsapp") || "") || null,
          source_name: String(form.get("source_name") || "") || null,
          source_url: String(form.get("source_url") || "") || null,
          notes: String(form.get("notes") || "") || null,
        },
      });
      toast.success("تمت إضافة الشركة لقاعدة التواصل");
      event.currentTarget.reset();
      setShowForm(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إضافة الشركة");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (row: Row, status: Status) => {
    try {
      await changeStatus({ data: { id: row.id, status } });
      setRows((current) =>
        current.map((item) => (item.id === row.id ? { ...item, contact_status: status } : item)),
      );
      toast.success("تم تحديث حالة التواصل");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الحالة");
    }
  };

  return (
    <AdminLayout
      title="قاعدة الشركات والتواصل"
      breadcrumbs={[{ label: "قاعدة الشركات" }]}
      loading={loading}
    >
      <div className="space-y-5" dir="rtl">
        <section className="grid gap-3 sm:grid-cols-3">
          <Stat label="إجمالي الشركات" value={rows.length} />
          <Stat
            label="شركات مهتمة"
            value={rows.filter((r) => r.contact_status === "interested").length}
          />
          <Stat
            label="انضمت لسوقلي"
            value={rows.filter((r) => r.contact_status === "joined").length}
          />
        </section>

        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو النشاط أو المدينة أو الهاتف"
              className="pr-9"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Status | "all")}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">كل الحالات</option>
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={() => void load()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
          <Button onClick={() => setShowForm((value) => !value)} className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة شركة
          </Button>
        </div>

        {showForm && (
          <form
            onSubmit={submit}
            className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2 lg:grid-cols-3"
          >
            <Input name="name_ar" required placeholder="اسم الشركة بالعربي *" />
            <Input name="name_en" placeholder="اسم الشركة بالإنجليزي" />
            <Input name="industry" placeholder="النشاط" />
            <Input name="governorate" placeholder="المحافظة" />
            <Input name="city" placeholder="المدينة / المنطقة الصناعية" />
            <Input name="phone" placeholder="الهاتف" />
            <Input name="whatsapp" placeholder="واتساب" />
            <Input name="email" type="email" placeholder="البريد التجاري" />
            <Input name="website" placeholder="الموقع الإلكتروني" />
            <Input name="source_name" placeholder="مصدر البيانات" />
            <Input name="source_url" placeholder="رابط المصدر" />
            <Input name="notes" placeholder="ملاحظات" />
            <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}حفظ الشركة
              </Button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-right">الشركة</th>
                <th className="px-4 py-3 text-right">النشاط والمكان</th>
                <th className="px-4 py-3 text-right">التواصل</th>
                <th className="px-4 py-3 text-right">جودة البيانات</th>
                <th className="px-4 py-3 text-right">الحالة</th>
                <th className="px-4 py-3 text-right">إجراء سريع</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className="border-t align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{row.name_ar}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.name_en || row.source_name || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{row.industry || "غير محدد"}</div>
                    <div className="text-xs text-muted-foreground">
                      {[row.governorate, row.city].filter(Boolean).join(" - ") || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{row.phone || row.whatsapp || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.email || row.website || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{row.data_quality_score}%</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={row.contact_status}
                      onChange={(e) => void setStatus(row, e.target.value as Status)}
                      className="h-9 rounded-md border bg-background px-2 text-xs"
                    >
                      {statuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {row.whatsapp || row.phone ? (
                      <Button size="sm" variant="outline" asChild className="gap-1">
                        <a
                          target="_blank"
                          rel="noreferrer"
                          href={`https://wa.me/${String(row.whatsapp || row.phone).replace(/\D/g, "")}?text=${encodeURIComponent(`أهلًا ${row.name_ar}، أنشأنا لكم صفحة تعريفية مجانية على منصة سوقلي لعرض شركتكم أمام المشترين والشركات. نرحب بمراجعة البيانات والمطالبة بإدارة الصفحة مجانًا.`)}`}
                        >
                          <MessageCircle className="h-4 w-4" />
                          واتساب
                        </a>
                      </Button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {!visible.length && !loading && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-muted-foreground">
                    لا توجد شركات مطابقة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <Building2 className="h-4 w-4" />
        {label}
      </div>
      <div className="text-3xl font-bold">{value.toLocaleString("ar-EG")}</div>
    </div>
  );
}
