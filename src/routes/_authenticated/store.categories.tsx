import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { FolderTree, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createStoreCategory,
  deleteStoreCategory,
  listMyStoreCategories,
  updateStoreCategory,
} from "@/lib/stores.functions";

export const Route = createFileRoute("/_authenticated/store/categories")({
  head: () => ({ meta: [{ title: "أقسام المتجر — سوقلي" }] }),
  component: StoreCategoriesPage,
});

type Category = Awaited<ReturnType<typeof listMyStoreCategories>>["items"][number];

function StoreCategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listMyStoreCategories();
      setItems(result.items);
      setStoreId(result.storeId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحميل الأقسام");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setEditing(null);
    setNameAr("");
    setNameEn("");
    setSortOrder("0");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!nameAr.trim()) return toast.error("اكتب اسم القسم");
    setSaving(true);
    try {
      const payload = {
        name_ar: nameAr.trim(),
        name_en: nameEn.trim() || null,
        sort_order: Number(sortOrder || 0),
      };
      if (editing) {
        await updateStoreCategory({ data: { id: editing.id, ...payload } });
        toast.success("تم تحديث القسم");
      } else {
        await createStoreCategory({ data: payload });
        toast.success("تم إنشاء القسم");
      }
      resetForm();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ القسم");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-2">
      <SiteHeader />
      <main className="container-souqly max-w-4xl space-y-5 py-6 sm:py-10" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <FolderTree className="h-6 w-6 text-primary" />
              أقسام المتجر
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              رتّب منتجاتك في أقسام واضحة تظهر داخل واجهة متجرك.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/store">العودة للمتجر</Link>
          </Button>
        </div>

        {!loading && !storeId ? (
          <EmptyState
            icon={<FolderTree className="h-7 w-7" />}
            title="أنشئ متجرك أولًا"
            description="يلزم وجود متجر قبل إنشاء الأقسام."
            ctaLabel="افتح متجرك"
            ctaTo="/store/open"
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-4 font-semibold">الأقسام الحالية</h2>
              {loading ? (
                <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جارٍ التحميل…
                </div>
              ) : items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  لا توجد أقسام بعد. أضف أول قسم من النموذج.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{item.name_ar}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {item.name_en || item.slug} · الترتيب {item.sort_order}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`تعديل ${item.name_ar}`}
                        onClick={() => {
                          setEditing(item);
                          setNameAr(item.name_ar);
                          setNameEn(item.name_en || "");
                          setSortOrder(String(item.sort_order));
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        aria-label={`حذف ${item.name_ar}`}
                        onClick={async () => {
                          if (!window.confirm(`حذف قسم «${item.name_ar}»؟`)) return;
                          try {
                            await deleteStoreCategory({ data: { id: item.id } });
                            toast.success("تم حذف القسم");
                            await load();
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "تعذر حذف القسم");
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <form
              onSubmit={save}
              className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5"
            >
              <h2 className="font-semibold">{editing ? "تعديل القسم" : "إضافة قسم"}</h2>
              <div className="space-y-1.5">
                <Label htmlFor="category-name-ar">الاسم بالعربية</Label>
                <Input
                  id="category-name-ar"
                  value={nameAr}
                  onChange={(event) => setNameAr(event.target.value)}
                  maxLength={80}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category-name-en">الاسم بالإنجليزية</Label>
                <Input
                  id="category-name-en"
                  value={nameEn}
                  onChange={(event) => setNameEn(event.target.value)}
                  maxLength={80}
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category-order">الترتيب</Label>
                <Input
                  id="category-order"
                  type="number"
                  min={0}
                  max={10000}
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {editing ? "حفظ التعديل" : "إضافة"}
                </Button>
                {editing ? (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    إلغاء
                  </Button>
                ) : null}
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
