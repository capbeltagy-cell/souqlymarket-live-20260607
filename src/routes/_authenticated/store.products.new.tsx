import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Loader2, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { ImageUploader, toLegacyShape, type UploadedImage } from "@/components/ImageUploader";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createStoreProduct } from "@/lib/listings.functions";
import { getMyStore } from "@/lib/stores.functions";

export const Route = createFileRoute("/_authenticated/store/products/new")({
  head: () => ({ meta: [{ title: "إضافة منتج إلى متجرك — Souqly" }] }),
  component: NewStoreProduct,
});

type ProductStatus = "draft" | "active" | "out_of_stock" | "archived";

function parseVariants(value: string) {
  if (!value.trim()) return [];
  return value
    .split("\n")
    .map((line) => {
      const [name, rawValues] = line.split(":", 2);
      return {
        name: name?.trim() ?? "",
        values: (rawValues ?? "")
          .split(/[،,]/)
          .map((item) => item.trim())
          .filter(Boolean),
      };
    })
    .filter((variant) => variant.name && variant.values.length > 0);
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function NewStoreProduct() {
  const navigate = useNavigate();
  const fetchStore = useServerFn(getMyStore);
  const createProduct = useServerFn(createStoreProduct);
  const [checkingStore, setCheckingStore] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [category, setCategory] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [sku, setSku] = useState("");
  const [trackInventory, setTrackInventory] = useState(true);
  const [stockQuantity, setStockQuantity] = useState("");
  const [minOrderQuantity, setMinOrderQuantity] = useState("1");
  const [weightGrams, setWeightGrams] = useState("");
  const [status, setStatus] = useState<ProductStatus>("active");
  const [variants, setVariants] = useState("");
  const [shippingRequired, setShippingRequired] = useState(true);
  const [visibleInMarketplace, setVisibleInMarketplace] = useState(true);

  useEffect(() => {
    let active = true;
    void fetchStore()
      .then((result) => {
        if (!active) return;
        if (!result.store) {
          toast.error("يجب إنشاء متجر أولًا قبل إضافة المنتجات");
          void navigate({ to: "/store/open", replace: true });
          return;
        }
        setCheckingStore(false);
      })
      .catch(() => {
        if (!active) return;
        toast.error("تعذر التحقق من متجرك. حاول مرة أخرى");
        void navigate({ to: "/store", replace: true });
      });
    return () => {
      active = false;
    };
  }, [fetchStore, navigate]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!titleAr.trim()) return toast.error("أدخل اسم المنتج بالعربية");
    if (!price || Number(price) <= 0) return toast.error("أدخل سعرًا صحيحًا للمنتج");
    if (images.length === 0) return toast.error("أضف صورة واحدة على الأقل للمنتج");
    if (trackInventory && status === "active" && Number(stockQuantity) <= 0) {
      return toast.error("أدخل كمية المخزون أو اختر حالة غير متوفر");
    }

    setSubmitting(true);
    try {
      const legacyImages = toLegacyShape(images);
      await createProduct({
        data: {
          title_ar: titleAr.trim(),
          title_en: titleEn.trim() || null,
          description_ar: description.trim() || null,
          price: Number(price),
          compare_at_price: compareAtPrice ? Number(compareAtPrice) : null,
          category: category.trim() || null,
          images: legacyImages.images,
          image_sources: legacyImages.image_sources,
          sku: sku.trim() || null,
          track_inventory: trackInventory,
          stock_quantity: trackInventory ? Number(stockQuantity || 0) : 0,
          min_order_quantity: Number(minOrderQuantity || 1),
          weight_grams: weightGrams ? Number(weightGrams) : null,
          status,
          variants: parseVariants(variants),
          shipping_required: shippingRequired,
          visible_in_marketplace: visibleInMarketplace,
        },
      });
      toast.success("تمت إضافة المنتج إلى متجرك بنجاح");
      await navigate({ to: "/store" });
    } catch (error) {
      const message = (error as Error).message;
      if (message.includes("STORE_REQUIRED")) {
        toast.error("يجب إنشاء متجر أولًا قبل إضافة المنتجات");
        await navigate({ to: "/store/open" });
      } else {
        toast.error(message || "تعذر إضافة المنتج. راجع البيانات وحاول مرة أخرى");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingStore) {
    return (
      <div className="min-h-screen bg-surface-2">
        <SiteHeader />
        <main className="container-souqly grid min-h-[60vh] place-items-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            جارٍ التحقق من متجرك
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-2 flex flex-col">
      <SiteHeader />
      <main className="container-souqly w-full max-w-4xl flex-1 py-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <PackagePlus className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">إضافة منتج إلى متجرك</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              سيتم ربط المنتج بمتجرك وشركتك تلقائيًا وبشكل آمن.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/store">
              <ArrowRight className="h-4 w-4" />
              العودة للمتجر
            </Link>
          </Button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
            <h2 className="font-semibold">بيانات المنتج</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="اسم المنتج بالعربية" required>
                <Input
                  value={titleAr}
                  onChange={(e) => setTitleAr(e.target.value)}
                  maxLength={200}
                />
              </Field>
              <Field label="اسم المنتج بالإنجليزية (اختياري)">
                <Input
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  maxLength={200}
                />
              </Field>
            </div>
            <Field label="الوصف">
              <Textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={4000}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="سعر البيع (جنيه)" required>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </Field>
              <Field label="السعر قبل الخصم (اختياري)">
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                />
              </Field>
              <Field label="التصنيف">
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  maxLength={80}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
            <h2 className="font-semibold">صور المنتج</h2>
            <ImageUploader value={images} onChange={setImages} folder="store-products" max={10} />
          </section>

          <section className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
            <h2 className="font-semibold">المخزون والتجهيز</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="SKU (اختياري)">
                <Input value={sku} onChange={(e) => setSku(e.target.value)} maxLength={80} />
              </Field>
              <Field label="المخزون">
                <Input
                  type="number"
                  min="0"
                  disabled={!trackInventory}
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                />
              </Field>
              <Field label="الحد الأدنى للطلب">
                <Input
                  type="number"
                  min="1"
                  value={minOrderQuantity}
                  onChange={(e) => setMinOrderQuantity(e.target.value)}
                />
              </Field>
              <Field label="الوزن بالجرام (اختياري)">
                <Input
                  type="number"
                  min="1"
                  value={weightGrams}
                  onChange={(e) => setWeightGrams(e.target.value)}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={trackInventory}
                onChange={(e) => setTrackInventory(e.target.checked)}
              />
              تفعيل تتبع المخزون ومنع البيع بعد نفاد الكمية
            </label>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
            <h2 className="font-semibold">النشر والشحن</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="حالة المنتج">
                <Select value={status} onValueChange={(value) => setStatus(value as ProductStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="out_of_stock">غير متوفر</SelectItem>
                    <SelectItem value="archived">مؤرشف</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="متغيرات المنتج (اختياري)">
                <Textarea
                  value={variants}
                  onChange={(e) => setVariants(e.target.value)}
                  rows={3}
                  placeholder="اللون: أحمر، أزرق&#10;المقاس: صغير، متوسط، كبير"
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={shippingRequired}
                onChange={(e) => setShippingRequired(e.target.checked)}
              />
              المنتج يحتاج إلى شحن وفق سياسة المتجر
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={visibleInMarketplace}
                onChange={(e) => setVisibleInMarketplace(e.target.checked)}
              />
              إظهار المنتج في Marketplace العام أيضًا
            </label>
          </section>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="w-full sm:w-auto min-w-52"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              حفظ ونشر المنتج
            </Button>
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
