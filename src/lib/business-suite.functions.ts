import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AuthContext = { supabase: unknown; userId: string };
const db = (context: AuthContext) => context.supabase as any;

async function getCompany(context: AuthContext) {
  const { data, error } = await db(context)
    .from("companies")
    .select("id")
    .eq("owner_id", context.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("يجب إنشاء شركة أولًا لاستخدام أدوات الأعمال");
  return data.id as string;
}

const money = z.coerce.number().min(0).max(999999999);
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const getBusinessSuiteOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const companyId = await getCompany(context as AuthContext);
    const client = db(context as AuthContext);
    const [contacts, inventory, invoices, sales, purchases, suppliers] = await Promise.all([
      client.from("crm_contacts").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      client.from("inventory_items").select("id, quantity, minimum_quantity", { count: "exact" }).eq("company_id", companyId).eq("is_active", true),
      client.from("business_invoices").select("id, total, paid_amount, status", { count: "exact" }).eq("company_id", companyId),
      client.from("business_sales_orders").select("id, total", { count: "exact" }).eq("company_id", companyId),
      client.from("business_purchase_orders").select("id, total", { count: "exact" }).eq("company_id", companyId),
      client.from("business_suppliers").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    ]);
    for (const result of [contacts, inventory, invoices, sales, purchases, suppliers]) {
      if (result.error) throw new Error(result.error.message);
    }
    const stockRows = inventory.data ?? [];
    const invoiceRows = invoices.data ?? [];
    return {
      companyId,
      totals: {
        contacts: contacts.count ?? 0,
        inventoryItems: inventory.count ?? 0,
        lowStock: stockRows.filter((row: any) => Number(row.quantity) <= Number(row.minimum_quantity)).length,
        invoices: invoices.count ?? 0,
        outstanding: invoiceRows.reduce((sum: number, row: any) => sum + Math.max(0, Number(row.total) - Number(row.paid_amount)), 0),
        salesOrders: sales.count ?? 0,
        salesValue: (sales.data ?? []).reduce((sum: number, row: any) => sum + Number(row.total || 0), 0),
        purchaseOrders: purchases.count ?? 0,
        purchaseValue: (purchases.data ?? []).reduce((sum: number, row: any) => sum + Number(row.total || 0), 0),
        suppliers: suppliers.count ?? 0,
      },
    };
  });

export const listBusinessContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const companyId = await getCompany(context as AuthContext);
    const { data, error } = await db(context as AuthContext).from("crm_contacts")
      .select("id, full_name, email, phone, organization, status, notes, created_at")
      .eq("company_id", companyId).order("created_at", { ascending: false }).limit(250);
    if (error) throw new Error(error.message);
    return { contacts: data ?? [] };
  });

export const createBusinessContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    full_name: z.string().trim().min(2).max(160),
    email: z.string().trim().email().optional().or(z.literal("")),
    phone: optionalText(40), organization: optionalText(160), notes: optionalText(2000),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const companyId = await getCompany(context as AuthContext);
    const { error } = await db(context as AuthContext).from("crm_contacts").insert({
      company_id: companyId, created_by: context.userId, full_name: data.full_name,
      email: data.email || null, phone: data.phone || null, organization: data.organization || null, notes: data.notes || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listInventoryItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const companyId = await getCompany(context as AuthContext);
    const { data, error } = await db(context as AuthContext).from("inventory_items")
      .select("id, name, sku, barcode, quantity, reserved_quantity, minimum_quantity, unit_cost, unit_price, currency, is_active, created_at")
      .eq("company_id", companyId).order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const createInventoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    name: z.string().trim().min(2).max(200), sku: optionalText(80), quantity: money,
    minimum_quantity: money, unit_cost: money, unit_price: money,
  }).parse(input))
  .handler(async ({ context, data }) => {
    const companyId = await getCompany(context as AuthContext);
    const client = db(context as AuthContext);
    const { data: item, error } = await client.from("inventory_items").insert({
      company_id: companyId, name: data.name, sku: data.sku || null, quantity: data.quantity,
      minimum_quantity: data.minimum_quantity, unit_cost: data.unit_cost, unit_price: data.unit_price, currency: "EGP",
    }).select("id").single();
    if (error) throw new Error(error.message);
    if (data.quantity > 0) {
      const movement = await client.from("inventory_movements").insert({
        company_id: companyId, item_id: item.id, created_by: context.userId,
        movement_type: "opening", quantity: data.quantity, note: "رصيد افتتاحي",
      });
      if (movement.error) throw new Error(movement.error.message);
    }
    return { ok: true };
  });

export const listBusinessInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const companyId = await getCompany(context as AuthContext);
    const { data, error } = await db(context as AuthContext).from("business_invoices")
      .select("id, invoice_number, status, issue_date, due_date, currency, total, paid_amount, notes, crm_contacts(full_name)")
      .eq("company_id", companyId).order("created_at", { ascending: false }).limit(250);
    if (error) throw new Error(error.message);
    return { invoices: data ?? [] };
  });

export const createBusinessInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    contact_id: z.string().uuid().optional().or(z.literal("")), due_date: optionalText(20),
    description: z.string().trim().min(2).max(500), quantity: z.coerce.number().positive().max(999999),
    unit_price: money, discount: money, tax: money, notes: optionalText(2000),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const companyId = await getCompany(context as AuthContext);
    const client = db(context as AuthContext);
    const subtotal = Math.round(data.quantity * data.unit_price * 100) / 100;
    const total = Math.max(0, Math.round((subtotal - data.discount + data.tax) * 100) / 100);
    const invoiceNumber = `INV-${Date.now()}`;
    const { data: invoice, error } = await client.from("business_invoices").insert({
      company_id: companyId, contact_id: data.contact_id || null, created_by: context.userId,
      invoice_number: invoiceNumber, status: "issued", due_date: data.due_date || null,
      currency: "EGP", subtotal, discount: data.discount, tax: data.tax, total, notes: data.notes || null,
    }).select("id").single();
    if (error) throw new Error(error.message);
    const item = await client.from("business_invoice_items").insert({
      invoice_id: invoice.id, description: data.description, quantity: data.quantity, unit_price: data.unit_price,
    });
    if (item.error) throw new Error(item.error.message);
    return { ok: true, invoiceNumber };
  });

export const listSuppliers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const companyId = await getCompany(context as AuthContext);
    const { data, error } = await db(context as AuthContext).from("business_suppliers")
      .select("id, name, contact_name, email, phone, status, created_at")
      .eq("company_id", companyId).order("created_at", { ascending: false }).limit(250);
    if (error) throw new Error(error.message);
    return { suppliers: data ?? [] };
  });

export const createSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    name: z.string().trim().min(2).max(180), contact_name: optionalText(160),
    email: z.string().trim().email().optional().or(z.literal("")), phone: optionalText(40), notes: optionalText(2000),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const companyId = await getCompany(context as AuthContext);
    const { error } = await db(context as AuthContext).from("business_suppliers").insert({
      company_id: companyId, created_by: context.userId, name: data.name,
      contact_name: data.contact_name || null, email: data.email || null, phone: data.phone || null, notes: data.notes || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSalesOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const companyId = await getCompany(context as AuthContext);
    const { data, error } = await db(context as AuthContext).from("business_sales_orders")
      .select("id, order_number, status, order_date, currency, total, crm_contacts(full_name)")
      .eq("company_id", companyId).order("created_at", { ascending: false }).limit(250);
    if (error) throw new Error(error.message);
    return { orders: data ?? [] };
  });

export const createSalesOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    contact_id: z.string().uuid().optional().or(z.literal("")), description: z.string().trim().min(2).max(500),
    quantity: z.coerce.number().positive().max(999999), unit_price: money, notes: optionalText(2000),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const companyId = await getCompany(context as AuthContext);
    const client = db(context as AuthContext);
    const total = Math.round(data.quantity * data.unit_price * 100) / 100;
    const orderNumber = `SO-${Date.now()}`;
    const { data: order, error } = await client.from("business_sales_orders").insert({
      company_id: companyId, contact_id: data.contact_id || null, created_by: context.userId,
      order_number: orderNumber, status: "confirmed", currency: "EGP", subtotal: total, total, notes: data.notes || null,
    }).select("id").single();
    if (error) throw new Error(error.message);
    const item = await client.from("business_sales_order_items").insert({
      sales_order_id: order.id, description: data.description, quantity: data.quantity, unit_price: data.unit_price,
    });
    if (item.error) throw new Error(item.error.message);
    return { ok: true, orderNumber };
  });

export const listPurchaseOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const companyId = await getCompany(context as AuthContext);
    const { data, error } = await db(context as AuthContext).from("business_purchase_orders")
      .select("id, order_number, status, order_date, expected_date, currency, total, business_suppliers(name)")
      .eq("company_id", companyId).order("created_at", { ascending: false }).limit(250);
    if (error) throw new Error(error.message);
    return { orders: data ?? [] };
  });

export const createPurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    supplier_id: z.string().uuid().optional().or(z.literal("")), description: z.string().trim().min(2).max(500),
    quantity: z.coerce.number().positive().max(999999), unit_cost: money, expected_date: optionalText(20), notes: optionalText(2000),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const companyId = await getCompany(context as AuthContext);
    const client = db(context as AuthContext);
    const total = Math.round(data.quantity * data.unit_cost * 100) / 100;
    const orderNumber = `PO-${Date.now()}`;
    const { data: order, error } = await client.from("business_purchase_orders").insert({
      company_id: companyId, supplier_id: data.supplier_id || null, created_by: context.userId,
      order_number: orderNumber, status: "approved", expected_date: data.expected_date || null,
      currency: "EGP", subtotal: total, total, notes: data.notes || null,
    }).select("id").single();
    if (error) throw new Error(error.message);
    const item = await client.from("business_purchase_order_items").insert({
      purchase_order_id: order.id, description: data.description, quantity: data.quantity, unit_cost: data.unit_cost,
    });
    if (item.error) throw new Error(item.error.message);
    return { ok: true, orderNumber };
  });
