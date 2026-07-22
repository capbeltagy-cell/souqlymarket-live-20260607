import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Boxes, ContactRound, Loader2, Plus, ReceiptText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createBusinessContact,
  createInventoryItem,
  getBusinessSuiteOverview,
  listBusinessContacts,
  listBusinessInvoices,
  listInventoryItems,
} from "@/lib/business-suite.functions";

export const Route = createFileRoute("/_authenticated/business-suite")({
  head: () => ({ meta: [{ title: "إدارة الأعمال — سوقلي" }] }),
  component: BusinessSuitePage,
});

type Overview = Awaited<ReturnType<typeof getBusinessSuiteOverview>>;
type Contact = Awaited<ReturnType<typeof listBusinessContacts>>["contacts"][number];
type Item = Awaited<ReturnType<typeof listInventoryItems>>["items"][number];
type Invoice = Awaited<ReturnType<typeof listBusinessInvoices>>["invoices"][number];

function BusinessSuitePage() {
  const getOverview = useServerFn(getBusinessSuiteOverview);
  const getContacts = useServerFn(listBusinessContacts);
  const getItems = useServerFn(listInventoryItems);
  const getInvoices = useServerFn(listBusinessInvoices);
  const addContact = useServerFn(createBusinessContact);
  const addItem = useServerFn(createInventoryItem);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [contactForm, setContactForm] = useState({ full_name: "", email: "", phone: "", organization: "", notes: "" });
  const [itemForm, setItemForm] = useState({ name: "", sku: "", quantity: "0", minimum_quantity: "0", unit_cost: "0", unit_price: "0" });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewResult, contactsResult, itemsResult, invoicesResult] = await Promise.all([
        getOverview(),
        getContacts(),
        getItems(),
        getInvoices(),
      ]);
      setOverview(overviewResult);
      setContacts(contactsResult.contacts);
      setItems(itemsResult.items);
      setInvoices(invoicesResult.invoices);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "تعذر تحميل أدوات الأعمال";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const lowStockIds = useMemo(
    () => new Set(items.filter((item) => Number(item.quantity) <= Number(item.minimum_quantity)).map((item) => item.id)),
    [items],
  );

  async function submitContact(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await addContact({ data: contactForm });
      toast.success("تمت إضافة العميل");
      setContactForm({ full_name: "", email: "", phone: "", organization: "", notes: "" });
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "تعذر إضافة العميل");
    } finally {
      setBusy(false);
    }
  }

  async function submitItem(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await addItem({ data: itemForm });
      toast.success("تمت إضافة الصنف");
      setItemForm({ name: "", sku: "", quantity: "0", minimum_quantity: "0", unit_cost: "0", unit_price: "0" });
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "تعذر إضافة الصنف");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-2">
      <SiteHeader />
      <main className="container-souqly py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">مركز إدارة الأعمال</h1>
            <p className="mt-1 text-sm text-muted-foreground">إدارة العملاء والمخزون والفواتير من مكان واحد.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className="me-2 h-4 w-4" /> تحديث
            </Button>
            <Button asChild variant="outline"><Link to="/dashboard">لوحة التحكم</Link></Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-6 text-sm">
            <p className="font-semibold">الوحدة جاهزة في الكود وتحتاج تطبيق Migration قاعدة البيانات.</p>
            <p className="mt-2 text-muted-foreground">{error}</p>
          </div>
        ) : loading ? (
          <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Stat label="العملاء" value={overview?.totals.contacts ?? 0} />
              <Stat label="أصناف المخزون" value={overview?.totals.inventoryItems ?? 0} />
              <Stat label="مخزون منخفض" value={overview?.totals.lowStock ?? 0} danger />
              <Stat label="الفواتير" value={overview?.totals.invoices ?? 0} />
              <Stat label="المبالغ المستحقة" value={`${Number(overview?.totals.outstanding ?? 0).toLocaleString("ar-EG")} ج.م`} />
            </div>

            <Tabs defaultValue="crm" dir="rtl">
              <TabsList className="grid w-full grid-cols-3 lg:w-[560px]">
                <TabsTrigger value="crm"><ContactRound className="me-2 h-4 w-4" />العملاء</TabsTrigger>
                <TabsTrigger value="inventory"><Boxes className="me-2 h-4 w-4" />المخزون</TabsTrigger>
                <TabsTrigger value="invoices"><ReceiptText className="me-2 h-4 w-4" />الفواتير</TabsTrigger>
              </TabsList>

              <TabsContent value="crm" className="mt-5 space-y-5">
                <form onSubmit={submitContact} className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-card md:grid-cols-2 lg:grid-cols-5">
                  <Field label="اسم العميل"><Input required value={contactForm.full_name} onChange={(e) => setContactForm({ ...contactForm, full_name: e.target.value })} /></Field>
                  <Field label="الهاتف"><Input value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} /></Field>
                  <Field label="البريد"><Input type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} /></Field>
                  <Field label="الشركة"><Input value={contactForm.organization} onChange={(e) => setContactForm({ ...contactForm, organization: e.target.value })} /></Field>
                  <div className="flex items-end"><Button className="w-full" disabled={busy}><Plus className="me-2 h-4 w-4" />إضافة عميل</Button></div>
                </form>
                <DataTable headers={["الاسم", "الشركة", "الهاتف", "البريد", "الحالة"]} empty="لا يوجد عملاء بعد">
                  {contacts.map((contact) => <tr key={contact.id} className="border-t border-border"><Cell>{contact.full_name}</Cell><Cell>{contact.organization || "—"}</Cell><Cell>{contact.phone || "—"}</Cell><Cell>{contact.email || "—"}</Cell><Cell>{contact.status}</Cell></tr>)}
                </DataTable>
              </TabsContent>

              <TabsContent value="inventory" className="mt-5 space-y-5">
                <form onSubmit={submitItem} className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-card md:grid-cols-3 lg:grid-cols-7">
                  <Field label="اسم الصنف"><Input required value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} /></Field>
                  <Field label="SKU"><Input value={itemForm.sku} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })} /></Field>
                  <Field label="الكمية"><Input type="number" min="0" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} /></Field>
                  <Field label="حد التنبيه"><Input type="number" min="0" value={itemForm.minimum_quantity} onChange={(e) => setItemForm({ ...itemForm, minimum_quantity: e.target.value })} /></Field>
                  <Field label="التكلفة"><Input type="number" min="0" value={itemForm.unit_cost} onChange={(e) => setItemForm({ ...itemForm, unit_cost: e.target.value })} /></Field>
                  <Field label="سعر البيع"><Input type="number" min="0" value={itemForm.unit_price} onChange={(e) => setItemForm({ ...itemForm, unit_price: e.target.value })} /></Field>
                  <div className="flex items-end"><Button className="w-full" disabled={busy}><Plus className="me-2 h-4 w-4" />إضافة</Button></div>
                </form>
                <DataTable headers={["الصنف", "SKU", "الكمية", "المتاح", "التكلفة", "سعر البيع"]} empty="لا توجد أصناف بعد">
                  {items.map((item) => <tr key={item.id} className={lowStockIds.has(item.id) ? "border-t border-warning/30 bg-warning/5" : "border-t border-border"}><Cell>{item.name}</Cell><Cell>{item.sku || "—"}</Cell><Cell>{Number(item.quantity).toLocaleString("ar-EG")}</Cell><Cell>{Math.max(0, Number(item.quantity) - Number(item.reserved_quantity)).toLocaleString("ar-EG")}</Cell><Cell>{Number(item.unit_cost).toLocaleString("ar-EG")}</Cell><Cell>{Number(item.unit_price).toLocaleString("ar-EG")}</Cell></tr>)}
                </DataTable>
              </TabsContent>

              <TabsContent value="invoices" className="mt-5">
                <DataTable headers={["رقم الفاتورة", "العميل", "التاريخ", "الاستحقاق", "الإجمالي", "المدفوع", "الحالة"]} empty="لا توجد فواتير بعد">
                  {invoices.map((invoice: any) => <tr key={invoice.id} className="border-t border-border"><Cell>{invoice.invoice_number}</Cell><Cell>{invoice.crm_contacts?.full_name || "—"}</Cell><Cell>{invoice.issue_date}</Cell><Cell>{invoice.due_date || "—"}</Cell><Cell>{Number(invoice.total).toLocaleString("ar-EG")} {invoice.currency}</Cell><Cell>{Number(invoice.paid_amount).toLocaleString("ar-EG")}</Cell><Cell>{invoice.status}</Cell></tr>)}
                </DataTable>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value, danger = false }: { label: string; value: string | number; danger?: boolean }) {
  return <div className="rounded-xl border border-border bg-card p-4 shadow-card"><p className="text-xs text-muted-foreground">{label}</p><p className={danger ? "mt-2 text-2xl font-bold text-warning" : "mt-2 text-2xl font-bold"}>{value}</p></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
function Cell({ children }: { children: React.ReactNode }) { return <td className="px-4 py-3 text-sm">{children}</td>; }
function DataTable({ headers, empty, children }: { headers: string[]; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card"><table className="w-full min-w-[720px]"><thead><tr>{headers.map((header) => <th key={header} className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">{header}</th>)}</tr></thead><tbody>{hasChildren ? children : <tr><td colSpan={headers.length} className="px-4 py-12 text-center text-sm text-muted-foreground">{empty}</td></tr>}</tbody></table></div>;
}
