import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveWorkspace } from "@/lib/company-workspace.functions";
import { asErpClient } from "@/lib/company-erp.database";

export const getCompanyCrm = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspace = await resolveWorkspace(context.supabase, context.userId);
    if (!workspace) throw new Error("لا توجد شركة مرتبطة بهذا الحساب.");
    const db = asErpClient(context.supabase);
    const { data, error } = await db
      .from("leads")
      .select(
        "id, listing_id, buyer_name, buyer_email, buyer_phone, message, status, source, estimated_value, next_follow_up_at, tags, assigned_to, created_at, updated_at, listings(title_ar, title_en)",
      )
      .eq("company_id", workspace.companyId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error("تعذر تحميل بيانات إدارة العملاء.");
    return { workspace, leads: data ?? [] };
  });

const crmUpdateSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(["new", "contacted", "negotiating", "won", "lost"]),
  estimatedValue: z.number().nonnegative().nullable().optional(),
  nextFollowUpAt: z.string().datetime().nullable().optional(),
  note: z.string().trim().max(2000).optional(),
});

export const updateCompanyCrmLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => crmUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const workspace = await resolveWorkspace(context.supabase, context.userId);
    if (!workspace?.canManageCrm) throw new Error("لا تملك صلاحية تعديل بيانات العملاء.");
    const db = asErpClient(context.supabase);
    const { data: lead } = await db
      .from("leads")
      .select("id, company_id, status")
      .eq("id", data.leadId)
      .eq("company_id", workspace.companyId)
      .maybeSingle();
    if (!lead) throw new Error("العميل المطلوب غير موجود.");

    const patch: {
      status: "new" | "contacted" | "negotiating" | "won" | "lost";
      updated_at: string;
      estimated_value?: number | null;
      next_follow_up_at?: string | null;
    } = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };
    if (data.estimatedValue !== undefined) patch.estimated_value = data.estimatedValue;
    if (data.nextFollowUpAt !== undefined) patch.next_follow_up_at = data.nextFollowUpAt;
    const { error } = await db.from("leads").update(patch).eq("id", lead.id);
    if (error) throw new Error("تعذر تحديث بيانات العميل.");

    if (data.note || lead.status !== data.status) {
      const { error: activityError } = await db.from("crm_activities").insert({
        company_id: workspace.companyId,
        lead_id: lead.id,
        actor_id: context.userId,
        activity_type: data.note ? "note" : "status_change",
        body: data.note || null,
        metadata: lead.status !== data.status ? { from: lead.status, to: data.status } : {},
      });
      if (activityError) throw new Error("تم تحديث العميل، لكن تعذر تسجيل النشاط.");
    }
    return { success: true };
  });

export const getCompanyInventory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspace = await resolveWorkspace(context.supabase, context.userId);
    if (!workspace) throw new Error("لا توجد شركة مرتبطة بهذا الحساب.");
    const db = asErpClient(context.supabase);
    const [{ data: products, error }, { data: movements }] = await Promise.all([
      db
        .from("listings")
        .select(
          "id, title_ar, title_en, sku, images, status, stock_quantity, track_inventory, updated_at",
        )
        .eq("company_id", workspace.companyId)
        .eq("type", "product")
        .order("updated_at", { ascending: false }),
      db
        .from("inventory_movements")
        .select("id, listing_id, movement_type, quantity_delta, balance_after, note, created_at")
        .eq("company_id", workspace.companyId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    if (error) throw new Error("تعذر تحميل مخزون الشركة.");
    return { workspace, products: products ?? [], movements: movements ?? [] };
  });

const adjustmentSchema = z.object({
  listingId: z.string().uuid(),
  quantityDelta: z
    .number()
    .int()
    .refine((value) => value !== 0),
  note: z.string().trim().max(500).optional(),
});

export const adjustCompanyInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => adjustmentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const workspace = await resolveWorkspace(context.supabase, context.userId);
    if (!workspace?.canManageInventory) throw new Error("لا تملك صلاحية تعديل المخزون.");
    const db = asErpClient(context.supabase);
    const { data: product } = await db
      .from("listings")
      .select("id")
      .eq("id", data.listingId)
      .eq("company_id", workspace.companyId)
      .eq("type", "product")
      .maybeSingle();
    if (!product) throw new Error("المنتج غير موجود ضمن هذه الشركة.");
    const { data: balance, error } = await db.rpc("adjust_company_inventory", {
      _listing_id: product.id,
      _quantity_delta: data.quantityDelta,
      _note: data.note || null,
      _location_id: null,
    });
    if (error) {
      if (error.message?.includes("insufficient_inventory"))
        throw new Error("الكمية المخصومة أكبر من المخزون المتاح.");
      throw new Error("تعذر تعديل المخزون.");
    }
    return { success: true, balance };
  });
