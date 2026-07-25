import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Boxes, Loader2, Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adjustCompanyInventory, getCompanyInventory } from "@/lib/company-erp.functions";

export const Route = createFileRoute("/_authenticated/company-workspace/inventory")({
  head: () => ({ meta: [{ title: "مخزون الشركة — سوقلي" }] }),
  component: CompanyInventoryPage,
});
type Payload = Awaited<ReturnType<typeof getCompanyInventory>>;

function CompanyInventoryPage() {
  const fetchInventory = useServerFn(getCompanyInventory);
  const adjust = useServerFn(adjustCompanyInventory);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(
    () =>
      fetchInventory()
        .then(setPayload)
        .catch((e: Error) => toast.error(e.message)),
    [fetchInventory],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const change = async (listingId: string, delta: number) => {
    setBusy(listingId);
    try {
      await adjust({
        data: { listingId, quantityDelta: delta, note: "تعديل يدوي من مساحة عمل الشركة" },
      });
      toast.success("تم تحديث كمية المخزون");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <SiteHeader />
      <main className="container-souqly flex-1 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-primary">{payload?.workspace.companyName}</p>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Boxes className="h-6 w-6" />
              المخزون
            </h1>
          </div>
          <Button asChild variant="outline">
            <Link to="/company-workspace">مساحة العمل</Link>
          </Button>
        </div>
        {!payload ? (
          <Loader2 className="mx-auto mt-20 h-6 w-6 animate-spin text-primary" />
        ) : payload.products.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
            <p className="text-muted-foreground">لا توجد منتجات مرتبطة بالشركة بعد.</p>
            <Button asChild className="mt-4">
              <Link to="/listings/new">إضافة منتج</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {payload.products.map((product) => {
              const stock = product.stock_quantity ?? 0;
              return (
                <div
                  key={product.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4"
                >
                  <div>
                    <strong>{product.title_ar || product.title_en}</strong>
                    <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                      {product.sku && <span>SKU: {product.sku}</span>}
                      <Badge variant={stock <= 5 ? "destructive" : "secondary"}>
                        {stock <= 5 ? "مخزون منخفض" : "متوفر"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="خصم وحدة"
                      disabled={
                        busy === product.id || stock <= 0 || !payload.workspace.canManageInventory
                      }
                      onClick={() => void change(product.id, -1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="min-w-12 text-center text-lg font-bold">{stock}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="إضافة وحدة"
                      disabled={busy === product.id || !payload.workspace.canManageInventory}
                      onClick={() => void change(product.id, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
