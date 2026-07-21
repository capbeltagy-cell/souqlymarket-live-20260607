import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, Star, Plus, ExternalLink } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EGYPT_GOVERNORATES } from "@/lib/egypt.locations";
import {
  importLaunchListings,
  listLaunchBatches,
  deleteLaunchBatch,
  listLaunchListings,
  adminToggleListingFlag,
  adminDeleteLaunchListing,
} from "@/lib/launch-content.functions";
import { requireAdminRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin-launch-content")({
  beforeLoad: requireAdminRoute,
  head: () => ({ meta: [{ title: "Launch Content — Admin" }] }),
  component: AdminLaunchContent,
});

const LISTING_TYPES = [
  "product",
  "land",
  "real_estate",
  "service",
  "business_opportunity",
] as const;

type Batch = {
  id: string;
  content_type: string;
  source_name: string | null;
  notes: string | null;
  item_count: number;
  created_at: string;
};
type Row = {
  id: string;
  type: string;
  title_ar: string;
  title_en: string;
  governorate: string | null;
  city: string | null;
  price: number | null;
  currency: string | null;
  featured: boolean;
  status: string;
  source_name: string | null;
  source_url: string | null;
  import_batch_id: string | null;
  created_at: string;
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const splitLine = (l: string) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (c === '"') {
        if (q && l[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = !q;
      } else if (c === "," && !q) {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = splitLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((l) => {
    const vals = splitLine(l);
    const o: Record<string, string> = {};
    headers.forEach((h, i) => {
      o[h] = vals[i] ?? "";
    });
    return o;
  });
}

function AdminLaunchContent() {
  const fImport = useServerFn(importLaunchListings);
  const fBatches = useServerFn(listLaunchBatches);
  const fDeleteBatch = useServerFn(deleteLaunchBatch);
  const fList = useServerFn(listLaunchListings);
  const fToggle = useServerFn(adminToggleListingFlag);
  const fDelete = useServerFn(adminDeleteLaunchListing);

  const [batches, setBatches] = useState<Batch[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterGov, setFilterGov] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterBatch, setFilterBatch] = useState<string>("all");
  const [busy, setBusy] = useState<string | null>(null);

  // Single record form
  const [form, setForm] = useState({
    type: "product" as (typeof LISTING_TYPES)[number],
    title_ar: "",
    title_en: "",
    description_ar: "",
    governorate: "",
    city: "",
    category: "",
    price: "",
    phone: "",
    whatsapp: "",
    source_name: "",
    source_url: "",
    images: "",
    featured: false,
  });

  // CSV import
  const [csvText, setCsvText] = useState("");
  const [csvSource, setCsvSource] = useState("");
  const [csvNotes, setCsvNotes] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [b, l] = await Promise.all([
        fBatches(),
        fList({
          data: {
            batchId: filterBatch !== "all" ? filterBatch : undefined,
            governorate: filterGov !== "all" ? filterGov : undefined,
            type: filterType !== "all" ? filterType : undefined,
          },
        }),
      ]);
      setBatches(b.batches as Batch[]);
      setRows(l.rows as Row[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [filterGov, filterType, filterBatch]);

  const submitSingle = async () => {
    if (!form.title_ar.trim()) return toast.error("العنوان مطلوب");
    setBusy("single");
    try {
      const res = await fImport({
        data: {
          rows: [
            {
              type: form.type,
              title_ar: form.title_ar,
              title_en: form.title_en || form.title_ar,
              description_ar: form.description_ar || undefined,
              governorate: form.governorate || undefined,
              city: form.city || undefined,
              category: form.category || undefined,
              price: form.price ? Number(form.price) : undefined,
              phone: form.phone || undefined,
              whatsapp: form.whatsapp || undefined,
              source_name: form.source_name || undefined,
              source_url: form.source_url || undefined,
              images: form.images
                ? form.images
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                : undefined,
              featured: form.featured,
            },
          ],
          sourceName: form.source_name || undefined,
          notes: "Single-record admin add",
        },
      });
      toast.success(`تم إضافة السجل (${res.inserted})`);
      setForm({ ...form, title_ar: "", title_en: "", description_ar: "", price: "", images: "" });
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const submitCSV = async () => {
    const parsed = parseCSV(csvText);
    if (parsed.length === 0) return toast.error("CSV فارغ أو غير صالح");
    const rowsPayload = parsed.map((r) => ({
      type: (LISTING_TYPES.includes(r.type as any)
        ? r.type
        : "product") as (typeof LISTING_TYPES)[number],
      title_ar: r.title_ar || r.title || "",
      title_en: r.title_en || r.title_ar || r.title || "",
      description_ar: r.description_ar || r.description || undefined,
      description_en: r.description_en || undefined,
      category: r.category || undefined,
      governorate: r.governorate || undefined,
      city: r.city || undefined,
      price: r.price ? Number(r.price) : undefined,
      currency: r.currency || undefined,
      phone: r.phone || undefined,
      whatsapp: r.whatsapp || undefined,
      source_name: r.source_name || csvSource || undefined,
      source_url: r.source_url || undefined,
      images: r.images
        ? r.images
            .split("|")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      featured: r.featured === "true" || r.featured === "1",
    }));
    setBusy("csv");
    try {
      const res = await fImport({
        data: {
          rows: rowsPayload,
          sourceName: csvSource || undefined,
          notes: csvNotes || undefined,
        },
      });
      toast.success(`تم استيراد ${res.inserted} سجل (Batch ${res.batchId.slice(0, 8)})`);
      setCsvText("");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const removeBatch = async (id: string) => {
    if (!confirm("حذف كل محتوى هذه الدفعة نهائياً؟")) return;
    setBusy(id);
    try {
      const res = await fDeleteBatch({ data: { batchId: id } });
      toast.success(`تم حذف ${res.deleted} سجل`);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const toggleFeatured = async (r: Row) => {
    setBusy(r.id);
    try {
      await fToggle({ data: { id: r.id, field: "featured", value: !r.featured } });
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const toggleStatus = async (r: Row) => {
    const next = r.status === "active" ? "pending" : "active";
    setBusy(r.id);
    try {
      await fToggle({ data: { id: r.id, field: "status", value: next } });
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const removeOne = async (id: string) => {
    if (!confirm("حذف هذا العنصر؟")) return;
    setBusy(id);
    try {
      await fDelete({ data: { id } });
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminLayout title="محتوى الإطلاق" breadcrumbs={[{ label: "محتوى الإطلاق" }]}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">محتوى الإطلاق (إدارة)</h1>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin-overview">لوحة الإدارة</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          أضف محتوى إطلاق حقيقي للاختبار عبر كل المحافظات. عند إضافة محتوى من مصدر خارجي، سيتم عرض
          «المصدر» و«رابط الإعلان الأصلي» في صفحة التفاصيل ولا يُنسب المحتوى لسوقلي.
        </p>

        <Tabs defaultValue="single">
          <TabsList>
            <TabsTrigger value="single">إضافة سجل</TabsTrigger>
            <TabsTrigger value="csv">استيراد CSV</TabsTrigger>
            <TabsTrigger value="manage">إدارة المحتوى</TabsTrigger>
            <TabsTrigger value="batches">الدفعات</TabsTrigger>
          </TabsList>

          <TabsContent
            value="single"
            className="space-y-3 rounded-lg border border-border bg-card p-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>النوع</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LISTING_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>المحافظة</Label>
                <Select
                  value={form.governorate || "none"}
                  onValueChange={(v) => setForm({ ...form, governorate: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {EGYPT_GOVERNORATES.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label_ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="العنوان (عربي) *"
                value={form.title_ar}
                onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                maxLength={300}
              />
              <Input
                placeholder="Title (EN)"
                value={form.title_en}
                onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                maxLength={300}
              />
              <Input
                placeholder="المدينة"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <Input
                placeholder="التصنيف"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              <Input
                placeholder="السعر (EGP)"
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
              <Input
                placeholder="هاتف"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                placeholder="واتساب"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              />
              <Input
                placeholder="اسم المصدر (اختياري)"
                value={form.source_name}
                onChange={(e) => setForm({ ...form, source_name: e.target.value })}
              />
              <Input
                placeholder="رابط الإعلان الأصلي"
                value={form.source_url}
                onChange={(e) => setForm({ ...form, source_url: e.target.value })}
              />
              <Input
                placeholder="روابط صور مفصولة بفاصلة"
                value={form.images}
                onChange={(e) => setForm({ ...form, images: e.target.value })}
                className="md:col-span-2"
              />
              <Textarea
                placeholder="الوصف"
                value={form.description_ar}
                onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                rows={3}
                className="md:col-span-2"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                />{" "}
                مميز
              </label>
              <Button onClick={submitSingle} disabled={busy === "single"} className="gap-1">
                {busy === "single" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}{" "}
                إضافة
              </Button>
            </div>
          </TabsContent>

          <TabsContent
            value="csv"
            className="space-y-3 rounded-lg border border-border bg-card p-4"
          >
            <div className="text-xs text-muted-foreground">
              الأعمدة المدعومة:{" "}
              <code>
                type,title_ar,title_en,description_ar,description_en,category,governorate,city,price,currency,phone,whatsapp,source_name,source_url,images,featured
              </code>
              — الصور مفصولة بـ | وليس فاصلة.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input
                placeholder="اسم المصدر الافتراضي"
                value={csvSource}
                onChange={(e) => setCsvSource(e.target.value)}
              />
              <Input
                placeholder="ملاحظات الدفعة"
                value={csvNotes}
                onChange={(e) => setCsvNotes(e.target.value)}
              />
            </div>
            <Textarea
              rows={10}
              placeholder="ألصق CSV هنا (السطر الأول = العناوين)"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="font-mono text-xs"
            />
            <Button
              onClick={submitCSV}
              disabled={busy === "csv" || !csvText.trim()}
              className="gap-1"
            >
              {busy === "csv" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}{" "}
              استيراد
            </Button>
          </TabsContent>

          <TabsContent value="manage" className="space-y-3">
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <Label className="text-xs">المحافظة</Label>
                <Select value={filterGov} onValueChange={setFilterGov}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {EGYPT_GOVERNORATES.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label_ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">النوع</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {LISTING_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">الدفعة</Label>
                <Select value={filterBatch} onValueChange={setFilterBatch}>
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.source_name || b.id.slice(0, 8)} ({b.item_count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "تحديث"}
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {rows.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  لا يوجد محتوى إطلاق مطابق
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {rows.map((r) => (
                    <div key={r.id} className="p-3 flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{r.title_ar || r.title_en}</div>
                        <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
                          <Badge variant="outline">{r.type}</Badge>
                          {r.governorate && <span>{r.governorate}</span>}
                          {r.city && <span>· {r.city}</span>}
                          {r.price ? (
                            <span>
                              · {r.price} {r.currency}
                            </span>
                          ) : null}
                          {r.source_name && <span>· المصدر: {r.source_name}</span>}
                          {r.source_url && (
                            <a
                              href={r.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary inline-flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              الأصلي
                            </a>
                          )}
                          <Badge variant={r.status === "active" ? "default" : "outline"}>
                            {r.status}
                          </Badge>
                          {r.featured && (
                            <Badge className="bg-accent text-accent-foreground">مميز</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/listings/$id" params={{ id: r.id }}>
                            عرض
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleFeatured(r)}
                          disabled={busy === r.id}
                          className="gap-1"
                        >
                          <Star className="h-3 w-3" />
                          {r.featured ? "إلغاء" : "تمييز"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleStatus(r)}
                          disabled={busy === r.id}
                        >
                          {r.status === "active" ? "إيقاف" : "تفعيل"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeOne(r.id)}
                          disabled={busy === r.id}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="batches" className="space-y-3">
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {batches.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">لا توجد دفعات</div>
              ) : (
                <div className="divide-y divide-border">
                  {batches.map((b) => (
                    <div key={b.id} className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          {b.source_name || "بدون مصدر"}{" "}
                          <Badge variant="outline" className="ml-2">
                            {b.item_count}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(b.created_at).toLocaleString()} · {b.content_type} ·{" "}
                          {b.notes || "—"}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeBatch(b.id)}
                        disabled={busy === b.id}
                        className="gap-1"
                      >
                        {busy === b.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}{" "}
                        حذف الدفعة
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
