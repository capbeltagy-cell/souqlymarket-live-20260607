import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMarketerGuard } from "@/hooks/useMarketerGuard";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import { createWholesale, listCategories } from "@/lib/phase3.functions";

export const Route = createFileRoute("/_authenticated/wholesale/new")({ component: NewWholesale });

const STORAGE_SLUGS = new Set(["warehouses", "storage-services"]);

function NewWholesale() {
  useMarketerGuard();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [moq, setMoq] = useState("1");
  const [price, setPrice] = useState("");
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [unit, setUnit] = useState("");
  const [available, setAvailable] = useState("");
  const [gov, setGov] = useState("");
  const [city, setCity] = useState("");
  const [cat, setCat] = useState("");
  const [imgs, setImgs] = useState("");
  const [delivery, setDelivery] = useState(false);
  const [shipping, setShipping] = useState(false);
  // Storage-specific
  const [warehouseType, setWarehouseType] = useState("");
  const [storageArea, setStorageArea] = useState("");
  const [availableCapacity, setAvailableCapacity] = useState("");
  const [storageType, setStorageType] = useState("");
  const [suitableGoods, setSuitableGoods] = useState("");
  const [loading, setLoading] = useState(false);
  const [pricingMethod, setPricingMethod] = useState("");
  const [cats, setCats] = useState<{ slug: string; name_ar: string; name_en: string }[]>([]);
  useEffect(() => {
    listCategories().then((r) => setCats(r.categories));
  }, []);

  const kind: "product" | "storage" = useMemo(
    () => (STORAGE_SLUGS.has(cat) ? "storage" : "product"),
    [cat],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const attributes: Record<string, unknown> = {};
      if (kind === "storage") {
        if (warehouseType) attributes.warehouse_type = warehouseType;
        if (storageArea) attributes.storage_area_sqm = Number(storageArea);
        if (availableCapacity) attributes.available_capacity = availableCapacity;
        if (storageType) attributes.storage_type = storageType;
        if (suitableGoods) attributes.suitable_goods = suitableGoods;
        attributes.loading_unloading = loading;
        if (pricingMethod) attributes.pricing_method = pricingMethod;
      }
      const r = await createWholesale({
        data: {
          title,
          description: desc || undefined,
          moq: Number(moq) || 1,
          price_per_unit: price ? Number(price) : undefined,
          wholesale_price: wholesalePrice ? Number(wholesalePrice) : undefined,
          unit: unit || undefined,
          available_quantity: available ? Number(available) : undefined,
          governorate: gov || undefined,
          city: city || undefined,
          category_slug: cat || undefined,
          images: imgs.split(/\s+/).filter(Boolean),
          kind,
          delivery_available: delivery,
          shipping_available: shipping,
          attributes: Object.keys(attributes).length ? attributes : undefined,
        },
      });
      toast.success(ar ? "تم النشر" : "Posted");
      nav({ to: "/wholesale/$id", params: { id: r.id } });
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">
          {kind === "storage"
            ? ar
              ? "إضافة مخزن / خدمة تخزين"
              : "New Warehouse / Storage"
            : ar
              ? "منتج جملة جديد"
              : "New Wholesale Product"}
        </h1>
        <form onSubmit={submit} className="space-y-3">
          <select
            required
            className="h-10 w-full rounded-md border border-input bg-background px-3"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            <option value="">{ar ? "اختر القسم / السوق" : "Sector / category"}</option>
            {cats.map((c) => (
              <option key={c.slug} value={c.slug}>
                {ar ? c.name_ar : c.name_en}
              </option>
            ))}
          </select>

          <Input
            required
            maxLength={200}
            placeholder={ar ? "العنوان" : "Title"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            rows={5}
            placeholder={ar ? "الوصف" : "Description"}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />

          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              placeholder={ar ? "المحافظة" : "Governorate"}
              value={gov}
              onChange={(e) => setGov(e.target.value)}
            />
            <Input
              placeholder={ar ? "المدينة" : "City"}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          {kind === "product" ? (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  placeholder={
                    ar ? "وحدة القياس (كجم، طن، كرتونة...)" : "Unit (kg, ton, carton...)"
                  }
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
                <Input
                  type="number"
                  min="1"
                  required
                  placeholder={ar ? "الحد الأدنى للطلب" : "MOQ"}
                  value={moq}
                  onChange={(e) => setMoq(e.target.value)}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={ar ? "السعر للمستهلك" : "Retail price"}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={ar ? "سعر الجملة" : "Wholesale price"}
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(e.target.value)}
                />
                <Input
                  type="number"
                  min="0"
                  placeholder={ar ? "الكمية المتوفرة" : "Available quantity"}
                  value={available}
                  onChange={(e) => setAvailable(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={delivery}
                    onChange={(e) => setDelivery(e.target.checked)}
                  />
                  {ar ? "توصيل متاح" : "Delivery available"}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={shipping}
                    onChange={(e) => setShipping(e.target.checked)}
                  />
                  {ar ? "شحن للمحافظات" : "Shipping available"}
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  placeholder={ar ? "نوع المخزن (جاف / مبرد / مجمد)" : "Warehouse type"}
                  value={warehouseType}
                  onChange={(e) => setWarehouseType(e.target.value)}
                />
                <Input
                  placeholder={ar ? "نوع التخزين" : "Storage type"}
                  value={storageType}
                  onChange={(e) => setStorageType(e.target.value)}
                />
                <Input
                  type="number"
                  min="0"
                  placeholder={ar ? "المساحة (م²)" : "Area (sqm)"}
                  value={storageArea}
                  onChange={(e) => setStorageArea(e.target.value)}
                />
                <Input
                  placeholder={ar ? "السعة المتاحة" : "Available capacity"}
                  value={availableCapacity}
                  onChange={(e) => setAvailableCapacity(e.target.value)}
                />
                <Input
                  placeholder={ar ? "السلع المناسبة" : "Suitable goods"}
                  value={suitableGoods}
                  onChange={(e) => setSuitableGoods(e.target.value)}
                />
                <Input
                  placeholder={ar ? "طريقة التسعير (يومي/شهري/م²)" : "Pricing method"}
                  value={pricingMethod}
                  onChange={(e) => setPricingMethod(e.target.value)}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={ar ? "السعر (اختياري)" : "Price (optional)"}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={loading}
                    onChange={(e) => setLoading(e.target.checked)}
                  />
                  {ar ? "خدمات تحميل/تفريغ" : "Loading / unloading"}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={delivery}
                    onChange={(e) => setDelivery(e.target.checked)}
                  />
                  {ar ? "لوجستيات/توصيل" : "Logistics / delivery"}
                </label>
              </div>
            </>
          )}

          <Textarea
            rows={2}
            placeholder={ar ? "روابط الصور (مفصولة بمسافات)" : "Image URLs (space-separated)"}
            value={imgs}
            onChange={(e) => setImgs(e.target.value)}
          />
          <Button type="submit" className="bg-primary hover:bg-primary-hover">
            {ar ? "نشر" : "Publish"}
          </Button>
        </form>
      </section>
      <SiteFooter />
    </div>
  );
}
