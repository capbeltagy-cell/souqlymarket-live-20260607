import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Loader2, PackageOpen, Plus, Save, Star, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPrice } from "@/lib/currency";
import { deleteStoreCategory, getMyStoreCatalog, saveStoreCategory, saveStoreListingSetting } from "@/lib/store-catalog.functions";

export const Route = createFileRoute("/_authenticated/store-catalog")({
  head: () => ({ meta: [{ title: "كتالوج المتجر — سوقلي" }] }),
  component: StoreCatalogPage,
});

type Category = { id: string; name_ar: string; name_en: string | null; slug: string; sort_order: number; is_active: boolean };
type Listing = { id: string; title_ar: string; title_en: string | null; price: number | null; currency: string; images: string[] | null };
type Setting = { listing_id: string; category_id: string | null; is_featured: boolean; sort_order: number; is_visible: boolean };

function StoreCatalogPage() {
  const load = useServerFn(getMyStoreCatalog);
  const saveCategory = useServerFn(saveStoreCategory);
  const removeCategory = useServerFn(deleteStoreCategory);
  const saveSetting = useServerFn(saveStoreListingSetting);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [settings, setSettings] = useState<Record<string, Setting>>({});
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const reload = async () => {
    setLoading(true);
    try {
      const result = await load();
      setCategories(result.categories as Category[]);
      setListings(result.listings as Listing[]);
      const map: Record<string, Setting> = {};
      for (const row of result.settings as Setting[]) map[row.listing_id] = row;
      setSettings(map);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, []);

  const categoryOptions = useMemo(() => categories.filter((item) => item.is_active), [categories]);

  async function addCategory() {
    if (!name.trim() || !slug.trim()) return toast.error("اكتب اسم القسم والرابط");
    try {
      await saveCategory({ data: { name_ar: name, slug, sort_order: categories.length, is_active: true } });
      setName("");
      setSlug("");
      toast.success("تم إضافة القسم");
      await reload();
    } catch (error) {
      toast.error((error as Error).message === "CATEGORY_SLUG_TAKEN" ? "رابط القسم مستخدم" : (error as Error).message);
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("حذف القسم؟ المنتجات ستظل موجودة بدون قسم.")) return;
    try {
      await removeCategory({ data: { id } });
      toast.success("تم حذف القسم");
      await reload();
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function persist(listingId: string, patch: Partial<Setting>) {
    const current = settings[listingId] ?? { listing_id: listingId, category_id: null, is_featured: false, sort_order: 0, is_visible: true };
    const next = { ...current, ...patch };
    setSettings((value) => ({ ...value, [listingId]: next }));
    setSavingId(listingId);
    try {
      await saveSetting({ data: next });
      toast.success("تم تحديث المنتج");
    } catch (error) {
      toast.error((error as Error).message);
      await reload();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/20" dir="rtl">
      <SiteHeader />
      <main className="container-souqly py-8 flex-1 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Store className="h-6 w-6" /> كتالوج المتجر</h1>
            <p className="text-sm text-muted-foreground mt-1">نظّم منتجاتك في أقسام وحدد ما يظهر أولًا.</p>
          </div>
          <Button asChild variant="outline"><Link to="/store">إعدادات المتجر</Link></Button>
        </div>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-bold mb-4">أقسام المتجر</h2>
          <div className="grid sm:grid-cols-[1fr,1fr,auto] gap-3 items-end">
            <div><Label>اسم القسم</Label><Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: إلكترونيات" /></div>
            <div><Label>رابط القسم</Label><Input className="mt-1" dir="ltr" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="electronics" /></div>
            <Button onClick={addCategory}><Plus className="h-4 w-4 ms-2" /> إضافة</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {categories.map((category) => (
              <span key={category.id} className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm">
                {category.name_ar}
                <button onClick={() => deleteCategory(category.id)} aria-label="حذف"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
              </span>
            ))}
            {categories.length === 0 && <span className="text-sm text-muted-foreground">لم تضف أقسامًا بعد.</span>}
          </div>
        </section>

        <section className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b"><h2 className="font-bold">منتجات المتجر</h2><p className="text-sm text-muted-foreground mt-1">{listings.length} منتج منشور</p></div>
          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div>
          ) : listings.length === 0 ? (
            <div className="py-16 text-center"><PackageOpen className="h-10 w-10 mx-auto text-muted-foreground" /><p className="mt-3 text-muted-foreground">لا توجد منتجات منشورة.</p></div>
          ) : (
            <div className="divide-y">
              {listings.map((listing) => {
                const current = settings[listing.id] ?? { listing_id: listing.id, category_id: null, is_featured: false, sort_order: 0, is_visible: true };
                return (
                  <div key={listing.id} className="p-4 grid md:grid-cols-[72px,1fr,180px,120px,100px] gap-4 items-center">
                    <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden">{listing.images?.[0] ? <img src={listing.images[0]} alt="" className="h-full w-full object-cover" /> : null}</div>
                    <div><h3 className="font-semibold">{listing.title_ar}</h3><p className="text-sm text-muted-foreground mt-1">{listing.price === null ? "السعر عند الطلب" : formatPrice(listing.price, listing.currency)}</p></div>
                    <select className="h-10 rounded-md border bg-background px-3 text-sm" value={current.category_id ?? ""} onChange={(e) => void persist(listing.id, { category_id: e.target.value || null })}>
                      <option value="">بدون قسم</option>
                      {categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name_ar}</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={current.is_featured} onCheckedChange={(value) => void persist(listing.id, { is_featured: !!value })} /><Star className="h-4 w-4" /> مميز</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={current.is_visible} onCheckedChange={(value) => void persist(listing.id, { is_visible: !!value })} /> ظاهر</label>
                    {savingId === listing.id && <div className="md:col-span-5 text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> جارٍ الحفظ</div>}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
