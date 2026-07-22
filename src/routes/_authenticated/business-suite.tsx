import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Boxes, ContactRound, Loader2, Plus, ReceiptText, RefreshCw, ShoppingCart, Truck } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createBusinessContact,
  createBusinessInvoice,
  createInventoryItem,
  createPurchaseOrder,
  createSalesOrder,
  createSupplier,
  getBusinessSuiteOverview,
  listBusinessContacts,
  listBusinessInvoices,
  listInventoryItems,
  listPurchaseOrders,
  listSalesOrders,
  listSuppliers,
} from "@/lib/business-suite.functions";

export const Route = createFileRoute("/_authenticated/business-suite")({
  head: () => ({ meta: [{ title: "إدارة الأعمال — سوقلي" }] }),
  component: BusinessSuitePage,
});

type Overview = Awaited<ReturnType<typeof getBusinessSuiteOverview>>;
type Contact = Awaited<ReturnType<typeof listBusinessContacts>>["contacts"][number];
type Item = Awaited<ReturnType<typeof listInventoryItems>>["items"][number];
type Invoice = Awaited<ReturnType<typeof listBusinessInvoices>>["invoices"][number];
type Supplier = Awaited<ReturnType<typeof listSuppliers>>["suppliers"][number];
type SalesOrder = Awaited<ReturnType<typeof listSalesOrders>>["orders"][number];
type PurchaseOrder = Awaited<ReturnType<typeof listPurchaseOrders>>["orders"][number];

const emptyLine = { description: "", quantity: "1", price: "0", relation_id: "", date: "", notes: "" };

function BusinessSuitePage() {
  const getOverview = useServerFn(getBusinessSuiteOverview);
  const getContacts = useServerFn(listBusinessContacts);
  const getItems = useServerFn(listInventoryItems);
  const getInvoices = useServerFn(listBusinessInvoices);
  const getSuppliers = useServerFn(listSuppliers);
  const getSales = useServerFn(listSalesOrders);
  const getPurchases = useServerFn(listPurchaseOrders);
  const addContact = useServerFn(createBusinessContact);
  const addItem = useServerFn(createInventoryItem);
  const addInvoice = useServerFn(createBusinessInvoice);
  const addSupplier = useServerFn(createSupplier);
  const addSale = useServerFn(createSalesOrder);
  const addPurchase = useServerFn(createPurchaseOrder);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<SalesOrder[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [contactForm, setContactForm] = useState({ full_name: "", email: "", phone: "", organization: "", notes: "" });
  const [itemForm, setItemForm] = useState({ name: "", sku: "", quantity: "0", minimum_quantity: "0", unit_cost: "0", unit_price: "0" });
  const [supplierForm, setSupplierForm] = useState({ name: "", contact_name: "", email: "", phone: "", notes: "" });
  const [invoiceForm, setInvoiceForm] = useState({ ...emptyLine, discount: "0", tax: "0" });
  const [salesForm, setSalesForm] = useState({ ...emptyLine });
  const [purchaseForm, setPurchaseForm] = useState({ ...emptyLine });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewResult, contactsResult, itemsResult, invoicesResult, suppliersResult, salesResult, purchasesResult] = await Promise.all([
        getOverview(), getContacts(), getItems(), getInvoices(), getSuppliers(), getSales(), getPurchases(),
      ]);
      setOverview(overviewResult);
      setContacts(contactsResult.contacts);
      setItems(itemsResult.items);
      setInvoices(invoicesResult.invoices);
      setSuppliers(suppliersResult.suppliers);
      setSales(salesResult.orders);
      setPurchases(purchasesResult.orders);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل أدوات الأعمال");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const lowStockIds = useMemo(
    () => new Set(items.filter((item) => Number(item.quantity) <= Number(item.minimum_quantity)).map((item) => item.id)),
    [items],
  );

  async function run(action: () => Promise<unknown>, success: string, reset?: () => void) {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      reset?.();
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "تعذر تنفيذ العملية");
    } finally {
      setBusy(false);
    }
  }

  const submitContact = (event: FormEvent) => { event.preventDefault(); void run(() => addContact({ data: contactForm }), "تمت إضافة العميل", () => setContactForm({ full_name: "", email: "", phone: "", organization: "", notes: "" })); };
  const submitItem = (event: FormEvent) => { event.preventDefault(); void run(() => addItem({ data: itemForm }), "تمت إضافة الصنف", () => setItemForm({ name: "", sku: "", quantity: "0", minimum_quantity: "0", unit_cost: "0", unit_price: "0" })); };
  const submitSupplier = (event: FormEvent) => { event.preventDefault(); void run(() => addSupplier({ data: supplierForm }), "تمت إضافة المورد", () => setSupplierForm({ name: "", contact_name: "", email: "", phone: "", notes: "" })); };
  const submitInvoice = (event: FormEvent) => { event.preventDefault(); void run(() => addInvoice({ data: { contact_id: invoiceForm.relation_id, due_date: invoiceForm.date, description: invoiceForm.description, quantity: invoiceForm.quantity, unit_price: invoiceForm.price, discount: invoiceForm.discount, tax: invoiceForm.tax, notes: invoiceForm.notes } }), "تم إصدار الفاتورة", () => setInvoiceForm({ ...emptyLine, discount: "0", tax: "0" })); };
  const submitSale = (event: FormEvent) => { event.preventDefault(); void run(() => addSale({ data: { contact_id: salesForm.relation_id, description: salesForm.description, quantity: salesForm.quantity, unit_price: salesForm.price, notes: salesForm.notes } }), "تم إنشاء أمر البيع", () => setSalesForm({ ...emptyLine })); };
  const submitPurchase = (event: FormEvent) => { event.preventDefault(); void run(() => addPurchase({ data: { supplier_id: purchaseForm.relation_id, description: purchaseForm.description, quantity: purchaseForm.quantity, unit_cost: purchaseForm.price, expected_date: purchaseForm.date, notes: purchaseForm.notes } }), "تم إنشاء أمر الشراء", () => setPurchaseForm({ ...emptyLine })); };

  return (
    <div className="min-h-screen bg-surface-2">
      <SiteHeader />
      <main className="container-souqly py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div><h1 className="text-2xl font-bold">مركز إدارة الأعمال</h1><p className="mt-1 text-sm text-muted-foreground">العملاء والمخزون والفواتير والمبيعات والمشتريات في مكان واحد.</p></div>
          <div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="me-2 h-4 w-4" /> تحديث</Button><Button asChild variant="outline"><Link to="/dashboard">لوحة التحكم</Link></Button></div>
        </div>

        {error ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-6 text-sm"><p className="font-semibold">الوحدة جاهزة في الكود وتحتاج تطبيق تحديثات قاعدة البيانات.</p><p className="mt-2 text-muted-foreground">{error}</p></div>
        ) : loading ? (
          <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
              <Stat label="العملاء" value={overview?.totals.contacts ?? 0} />
              <Stat label="الموردون" value={overview?.totals.suppliers ?? 0} />
              <Stat label="أصناف المخزون" value={overview?.totals.inventoryItems ?? 0} />
              <Stat label="مخزون منخفض" value={overview?.totals.lowStock ?? 0} danger />
              <Stat label="الفواتير" value={overview?.totals.invoices ?? 0} />
              <Stat label="أوامر البيع" value={overview?.totals.salesOrders ?? 0} />
              <Stat label="قيمة المبيعات" value={`${Number(overview?.totals.salesValue ?? 0).toLocaleString("ar-EG")} ج.م`} />
              <Stat label="قيمة المشتريات" value={`${Number(overview?.totals.purchaseValue ?? 0).toLocaleString("ar-EG")} ج.م`} />
            </div>

            <Tabs defaultValue="crm" dir="rtl">
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
                <TabsTrigger value="crm"><ContactRound className="me-2 h-4 w-4" />العملاء</TabsTrigger>
                <TabsTrigger value="inventory"><Boxes className="me-2 h-4 w-4" />المخزون</TabsTrigger>
                <TabsTrigger value="invoices"><ReceiptText className="me-2 h-4 w-4" />الفواتير</TabsTrigger>
                <TabsTrigger value="sales"><ShoppingCart className="me-2 h-4 w-4" />المبيعات</TabsTrigger>
                <TabsTrigger value="suppliers"><Truck className="me-2 h-4 w-4" />الموردون</TabsTrigger>
                <TabsTrigger value="purchases"><Truck className="me-2 h-4 w-4" />المشتريات</TabsTrigger>
              </TabsList>

              <TabsContent value="crm" className="mt-5 space-y-5">
                <form onSubmit={submitContact} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2 lg:grid-cols-5">
                  <Field label="اسم العميل"><Input required value={contactForm.full_name} onChange={(e) => setContactForm({ ...contactForm, full_name: e.target.value })} /></Field>
                  <Field label="الهاتف"><Input value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} /></Field>
                  <Field label="البريد"><Input type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} /></Field>
                  <Field label="الشركة"><Input value={contactForm.organization} onChange={(e) => setContactForm({ ...contactForm, organization: e.target.value })} /></Field>
                  <Submit busy={busy} text="إضافة عميل" />
                </form>
                <DataTable headers={["الاسم", "الشركة", "الهاتف", "البريد", "الحالة"]} empty="لا يوجد عملاء بعد">{contacts.map((x) => <tr key={x.id} className="border-t"><Cell>{x.full_name}</Cell><Cell>{x.organization || "—"}</Cell><Cell>{x.phone || "—"}</Cell><Cell>{x.email || "—"}</Cell><Cell>{x.status}</Cell></tr>)}</DataTable>
              </TabsContent>

              <TabsContent value="inventory" className="mt-5 space-y-5">
                <form onSubmit={submitItem} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-3 lg:grid-cols-7">
                  <Field label="اسم الصنف"><Input required value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} /></Field>
                  <Field label="SKU"><Input value={itemForm.sku} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })} /></Field>
                  <NumberField label="الكمية" value={itemForm.quantity} onChange={(v) => setItemForm({ ...itemForm, quantity: v })} />
                  <NumberField label="حد التنبيه" value={itemForm.minimum_quantity} onChange={(v) => setItemForm({ ...itemForm, minimum_quantity: v })} />
                  <NumberField label="التكلفة" value={itemForm.unit_cost} onChange={(v) => setItemForm({ ...itemForm, unit_cost: v })} />
                  <NumberField label="سعر البيع" value={itemForm.unit_price} onChange={(v) => setItemForm({ ...itemForm, unit_price: v })} />
                  <Submit busy={busy} text="إضافة صنف" />
                </form>
                <DataTable headers={["الصنف", "SKU", "الكمية", "المتاح", "التكلفة", "سعر البيع"]} empty="لا توجد أصناف بعد">{items.map((x) => <tr key={x.id} className={lowStockIds.has(x.id) ? "border-t bg-warning/5" : "border-t"}><Cell>{x.name}</Cell><Cell>{x.sku || "—"}</Cell><Cell>{Number(x.quantity).toLocaleString("ar-EG")}</Cell><Cell>{Math.max(0, Number(x.quantity) - Number(x.reserved_quantity)).toLocaleString("ar-EG")}</Cell><Cell>{Number(x.unit_cost).toLocaleString("ar-EG")}</Cell><Cell>{Number(x.unit_price).toLocaleString("ar-EG")}</Cell></tr>)}</DataTable>
              </TabsContent>

              <TabsContent value="invoices" className="mt-5 space-y-5">
                <OrderForm title="إصدار فاتورة" form={invoiceForm} setForm={setInvoiceForm} relations={contacts.map((x) => ({ id: x.id, name: x.full_name }))} relationLabel="العميل" onSubmit={submitInvoice} busy={busy} extra={<><NumberField label="الخصم" value={invoiceForm.discount} onChange={(v) => setInvoiceForm({ ...invoiceForm, discount: v })} /><NumberField label="الضريبة" value={invoiceForm.tax} onChange={(v) => setInvoiceForm({ ...invoiceForm, tax: v })} /></>} />
                <DataTable headers={["رقم الفاتورة", "العميل", "التاريخ", "الاستحقاق", "الإجمالي", "المدفوع", "الحالة"]} empty="لا توجد فواتير بعد">{invoices.map((x: any) => <tr key={x.id} className="border-t"><Cell>{x.invoice_number}</Cell><Cell>{x.crm_contacts?.full_name || "—"}</Cell><Cell>{x.issue_date}</Cell><Cell>{x.due_date || "—"}</Cell><Cell>{Number(x.total).toLocaleString("ar-EG")} {x.currency}</Cell><Cell>{Number(x.paid_amount).toLocaleString("ar-EG")}</Cell><Cell>{x.status}</Cell></tr>)}</DataTable>
              </TabsContent>

              <TabsContent value="sales" className="mt-5 space-y-5">
                <OrderForm title="أمر بيع جديد" form={salesForm} setForm={setSalesForm} relations={contacts.map((x) => ({ id: x.id, name: x.full_name }))} relationLabel="العميل" onSubmit={submitSale} busy={busy} />
                <DataTable headers={["رقم الأمر", "العميل", "التاريخ", "القيمة", "الحالة"]} empty="لا توجد أوامر بيع بعد">{sales.map((x: any) => <tr key={x.id} className="border-t"><Cell>{x.order_number}</Cell><Cell>{x.crm_contacts?.full_name || "—"}</Cell><Cell>{x.order_date}</Cell><Cell>{Number(x.total).toLocaleString("ar-EG")} {x.currency}</Cell><Cell>{x.status}</Cell></tr>)}</DataTable>
              </TabsContent>

              <TabsContent value="suppliers" className="mt-5 space-y-5">
                <form onSubmit={submitSupplier} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2 lg:grid-cols-5">
                  <Field label="اسم المورد"><Input required value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} /></Field>
                  <Field label="مسؤول التواصل"><Input value={supplierForm.contact_name} onChange={(e) => setSupplierForm({ ...supplierForm, contact_name: e.target.value })} /></Field>
                  <Field label="الهاتف"><Input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} /></Field>
                  <Field label="البريد"><Input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} /></Field>
                  <Submit busy={busy} text="إضافة مورد" />
                </form>
                <DataTable headers={["المورد", "مسؤول التواصل", "الهاتف", "البريد", "الحالة"]} empty="لا يوجد موردون بعد">{suppliers.map((x) => <tr key={x.id} className="border-t"><Cell>{x.name}</Cell><Cell>{x.contact_name || "—"}</Cell><Cell>{x.phone || "—"}</Cell><Cell>{x.email || "—"}</Cell><Cell>{x.status}</Cell></tr>)}</DataTable>
              </TabsContent>

              <TabsContent value="purchases" className="mt-5 space-y-5">
                <OrderForm title="أمر شراء جديد" form={purchaseForm} setForm={setPurchaseForm} relations={suppliers.map((x) => ({ id: x.id, name: x.name }))} relationLabel="المورد" onSubmit={submitPurchase} busy={busy} />
                <DataTable headers={["رقم الأمر", "المورد", "التاريخ", "المتوقع", "القيمة", "الحالة"]} empty="لا توجد أوامر شراء بعد">{purchases.map((x: any) => <tr key={x.id} className="border-t"><Cell>{x.order_number}</Cell><Cell>{x.business_suppliers?.name || "—"}</Cell><Cell>{x.order_date}</Cell><Cell>{x.expected_date || "—"}</Cell><Cell>{Number(x.total).toLocaleString("ar-EG")} {x.currency}</Cell><Cell>{x.status}</Cell></tr>)}</DataTable>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function OrderForm({ title, form, setForm, relations, relationLabel, onSubmit, busy, extra }: { title: string; form: typeof emptyLine; setForm: (value: any) => void; relations: { id: string; name: string }[]; relationLabel: string; onSubmit: (event: FormEvent) => void; busy: boolean; extra?: ReactNode }) {
  return <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2 lg:grid-cols-7"><p className="col-span-full font-semibold">{title}</p><Field label={relationLabel}><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.relation_id} onChange={(e) => setForm({ ...form, relation_id: e.target.value })}><option value="">بدون اختيار</option>{relations.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><Field label="الوصف"><Input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field><NumberField label="الكمية" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} /><NumberField label="السعر" value={form.price} onChange={(v) => setForm({ ...form, price: v })} /><Field label="التاريخ"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>{extra}<Submit busy={busy} text="حفظ" /></form>;
}
function Stat({ label, value, danger = false }: { label: string; value: string | number; danger?: boolean }) { return <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={danger ? "mt-2 text-xl font-bold text-warning" : "mt-2 text-xl font-bold"}>{value}</p></div>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <Field label={label}><Input type="number" min="0" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} /></Field>; }
function Submit({ busy, text }: { busy: boolean; text: string }) { return <div className="flex items-end"><Button className="w-full" disabled={busy}><Plus className="me-2 h-4 w-4" />{text}</Button></div>; }
function Cell({ children }: { children: ReactNode }) { return <td className="px-4 py-3 text-sm">{children}</td>; }
function DataTable({ headers, empty, children }: { headers: string[]; empty: string; children: ReactNode }) { const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children); return <div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full min-w-[720px]"><thead><tr>{headers.map((header) => <th key={header} className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">{header}</th>)}</tr></thead><tbody>{hasChildren ? children : <tr><td colSpan={headers.length} className="px-4 py-12 text-center text-sm text-muted-foreground">{empty}</td></tr>}</tbody></table></div>; }
