import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getCompany(context: any) {
  const { data, error } = await context.supabase
    .from("companies")
    .select("id")
    .eq("owner_id", context.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("يجب إنشاء شركة أولًا لاستخدام أدوات الأعمال");
  return data.id as string;
}

export const getBusinessSuiteOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const companyId = await getCompany(context);
    const [contacts, inventory, invoices] = await Promise.all([
      context.supabase.from("crm_contacts").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      context.supabase.from("inventory_items").select("id, quantity, minimum_quantity", { count: "exact" }).eq("company_id", companyId).eq("is_active", true),
      context.supabase.from("business_invoices").select("id, total, paid_amount, status", { count: "exact" }).eq("company_id", companyId),
    ]);
    for (const result of [contacts, inventory, invoices]) if (result.error) throw new Error(result.error.message);
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
      },
    };
  });

export const listBusinessContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const companyId = await getCompany(context);
    const { data, error } = await context.supabase
      .from("crm_contacts")
      .select("id, full_name, email, phone, organization, status, notes, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(250);
    if (error) throw new Error(error.message);
    return { contacts: data ?? [] };
  });

export const createBusinessContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    full_name: z.string().trim().min(2).max(160),
    email: z.string().trim().email().optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    organization: z.string().trim().max(160).optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const companyId = await getCompany(context);
    const { error } = await context.supabase.from("crm_contacts").insert({
      company_id: companyId,
      created_by: context.userId,
      full_name: data.full_name,
      email: data.email || null,
      phone: data.phone || null,
      organization: data.organization || null,
      notes: data.notes || null,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listInventoryItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const companyId = await getCompany(context);
    const { data, error } = await context.supabase
      .from("inventory_items")
      .select("id, name, sku, barcode, quantity, reserved_quantity, minimum_quantity, unit_cost, unit_price, currency, is_active, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const createInventoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    name: z.string().trim().min(2).max(200),
    sku: z.string().trim().max(80).optional().or(z.literal("")),
    quantity: z.coerce.number().min(0),
    minimum_quantity: z.coerce.number().min(0),
    unit_cost: z.coerce.number().min(0),
    unit_price: z.coerce.number().min(0),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const companyId = await getCompany(context);
    const { error } = await context.supabase.from("inventory_items").insert({
      company_id: companyId,
      name: data.name,
      sku: data.sku || null,
      quantity: data.quantity,
      minimum_quantity: data.minimum_quantity,
      unit_cost: data.unit_cost,
      unit_price: data.unit_price,
      currency: "EGP",
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listBusinessInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const companyId = await getCompany(context);
    const { data, error } = await context.supabase
      .from("business_invoices")
      .select("id, invoice_number, status, issue_date, due_date, currency, total, paid_amount, notes, crm_contacts(full_name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(250);
    if (error) throw new Error(error.message);
    return { invoices: data ?? [] };
  });
