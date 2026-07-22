/* eslint-disable @typescript-eslint/no-explicit-any -- Phase 2 tables are intentionally absent from generated Production types until migrations are approved. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { hasPlatformAdminAccess } from "@/lib/admin-permissions";
import { assertOrderTransition, type AdminOrderStatus } from "@/lib/order-state-machine";

const MODULE_UNAVAILABLE = "هذه الوحدة جاهزة وستعمل بعد تطبيق تحديثات قاعدة البيانات.";
const modules = ["orders", "disputes", "moderation", "notifications", "listings"] as const;
type ModuleName = (typeof modules)[number];

const tableByModule: Record<ModuleName, string> = {
  orders: "wholesale_orders",
  disputes: "order_disputes",
  moderation: "moderation_reports",
  notifications: "notification_broadcasts",
  listings: "listings",
};

async function requireAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  if (!hasPlatformAdminAccess((data ?? []).map((row) => String(row.role))))
    throw new Error("Forbidden");
}

function missingTable(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
    (error.code === "42P01" ||
      error.code === "PGRST205" ||
      error.message?.includes("schema cache")),
  );
}

async function audit(
  userId: string,
  action: string,
  table: string,
  recordId: string,
  data: unknown,
) {
  const { error } = await supabaseAdmin.from("audit_logs").insert({
    user_id: userId,
    action,
    table_name: table,
    record_id: recordId,
    new_data: data as never,
  });
  if (error) throw new Error(error.message);
}

export const adminPhase2List = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        module: z.enum(modules),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(10).max(100).default(20),
        search: z.string().trim().max(120).default(""),
        status: z.string().trim().max(40).default(""),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const table = tableByModule[data.module];
    const from = (data.page - 1) * data.pageSize;
    let query = (supabaseAdmin as any).from(table).select("*", { count: "exact" });
    if (data.status)
      query = query.eq(data.module === "orders" ? "payment_status" : "status", data.status);
    if (data.search && data.module === "listings")
      query = query.or(`title_ar.ilike.%${data.search}%,title_en.ilike.%${data.search}%`);
    else if (data.search && z.string().uuid().safeParse(data.search).success)
      query = query.eq("id", data.search);
    const result = await query
      .order("created_at", { ascending: false })
      .range(from, from + data.pageSize - 1);
    if (missingTable(result.error))
      return { available: false as const, message: MODULE_UNAVAILABLE, rows: [], total: 0 };
    if (result.error) throw new Error(result.error.message);
    return {
      available: true as const,
      message: null,
      rows: result.data ?? [],
      total: result.count ?? 0,
    };
  });

export const adminPhase2Detail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ module: z.enum(modules), id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const table = tableByModule[data.module];
    const primary = await (supabaseAdmin as any).from(table).select("*").eq("id", data.id).single();
    if (missingTable(primary.error))
      return { available: false as const, message: MODULE_UNAVAILABLE, record: null, related: {} };
    if (primary.error) throw new Error(primary.error.message);
    const related: Record<string, Json[]> = {};
    const lookups =
      data.module === "orders"
        ? [
            ["history", "admin_order_status_history", "order_id"],
            ["disputes", "order_disputes", "order_id"],
            ["audit", "audit_logs", "record_id"],
          ]
        : data.module === "disputes"
          ? [["notes", "dispute_notes", "dispute_id"]]
          : data.module === "moderation"
            ? [
                ["notes", "moderation_notes", "report_id"],
                ["actions", "moderation_actions", "report_id"],
              ]
            : data.module === "notifications"
              ? [["delivery", "notification_delivery_logs", "broadcast_id"]]
              : [["audit", "audit_logs", "record_id"]];
    for (const [key, relatedTable, foreignKey] of lookups) {
      const result = await (supabaseAdmin as any)
        .from(relatedTable)
        .select("*")
        .eq(foreignKey, data.id)
        .order("created_at", { ascending: false });
      related[key] = missingTable(result.error)
        ? []
        : result.error
          ? []
          : ((result.data ?? []) as Json[]);
    }
    return { available: true as const, message: null, record: primary.data as Json, related };
  });

export const adminPhase2Action = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        module: z.enum(modules),
        id: z.string().uuid(),
        action: z.string().trim().min(1).max(60),
        value: z.string().trim().max(5000).optional(),
        assignee: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const table = tableByModule[data.module];
    if (data.module === "orders") {
      const historyAvailability = await (supabaseAdmin as any)
        .from("admin_order_status_history")
        .select("id", { head: true, count: "exact" });
      if (missingTable(historyAvailability.error))
        return { available: false as const, message: MODULE_UNAVAILABLE };
      if (historyAvailability.error) throw new Error(historyAvailability.error.message);
      const current = await (supabaseAdmin as any)
        .from(table)
        .select("status, payment_status")
        .eq("id", data.id)
        .single();
      if (current.error) throw new Error(current.error.message);
      const paymentAction = data.action === "paid" || data.action === "refunded";
      if (!paymentAction)
        assertOrderTransition(
          current.data.status as AdminOrderStatus,
          data.action as AdminOrderStatus,
        );
      const update = await (supabaseAdmin as any)
        .from(table)
        .update(paymentAction ? { payment_status: data.action } : { status: data.action })
        .eq("id", data.id);
      if (update.error) throw new Error(update.error.message);
      const history = await (supabaseAdmin as any).from("admin_order_status_history").insert({
        order_id: data.id,
        from_status: paymentAction ? current.data.payment_status : current.data.status,
        to_status: data.action,
        reason: data.value ?? null,
        actor_id: context.userId,
      });
      if (missingTable(history.error))
        return { available: false as const, message: MODULE_UNAVAILABLE };
      if (history.error) throw new Error(history.error.message);
    } else if (
      data.module === "moderation" &&
      ["hide_entity", "suspend_entity", "restore_entity"].includes(data.action)
    ) {
      const report = await (supabaseAdmin as any)
        .from("moderation_reports")
        .select("entity_type, entity_id")
        .eq("id", data.id)
        .single();
      if (missingTable(report.error))
        return { available: false as const, message: MODULE_UNAVAILABLE };
      if (report.error) throw new Error(report.error.message);
      const entityType = String(report.data.entity_type);
      const entityId = String(report.data.entity_id);
      if (entityType === "user") {
        const result = await supabaseAdmin.auth.admin.updateUserById(entityId, {
          ban_duration: data.action === "restore_entity" ? "none" : "876000h",
        });
        if (result.error) throw new Error(result.error.message);
      } else {
        const entityTable =
          entityType === "product"
            ? "listings"
            : entityType === "listing"
              ? "listings"
              : entityType === "store"
                ? "stores"
                : entityType === "company"
                  ? "companies"
                  : null;
        if (!entityTable) throw new Error("نوع الكيان لا يدعم الإيقاف الآلي");
        const patch =
          entityType === "company"
            ? { is_verified: data.action === "restore_entity" }
            : { status: data.action === "restore_entity" ? "published" : "suspended" };
        const result = await (supabaseAdmin as any)
          .from(entityTable)
          .update(patch)
          .eq("id", entityId);
        if (result.error) throw new Error(result.error.message);
      }
      await (supabaseAdmin as any).from("moderation_actions").insert({
        report_id: data.id,
        actor_id: context.userId,
        action: data.action,
        reason: data.value ?? null,
      });
    } else if (data.action === "note") {
      const noteTable = data.module === "disputes" ? "dispute_notes" : "moderation_notes";
      const foreignKey = data.module === "disputes" ? "dispute_id" : "report_id";
      const result = await (supabaseAdmin as any)
        .from(noteTable)
        .insert({ [foreignKey]: data.id, author_id: context.userId, body: data.value });
      if (missingTable(result.error))
        return { available: false as const, message: MODULE_UNAVAILABLE };
      if (result.error) throw new Error(result.error.message);
    } else {
      const patch =
        data.action === "assign"
          ? { assigned_to: data.assignee }
          : { status: data.action, resolution: data.value ?? null };
      const result = await (supabaseAdmin as any).from(table).update(patch).eq("id", data.id);
      if (missingTable(result.error))
        return { available: false as const, message: MODULE_UNAVAILABLE };
      if (result.error) throw new Error(result.error.message);
    }
    await audit(
      context.userId,
      `ADMIN_${data.module.toUpperCase()}_${data.action.toUpperCase()}`,
      table,
      data.id,
      data,
    );
    return { available: true as const, message: null };
  });

export const adminCreateNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().trim().min(2).max(160),
        message: z.string().trim().min(2).max(5000),
        targetKind: z.enum(["user", "company", "store", "role", "broadcast"]),
        targetId: z.string().uuid().optional(),
        targetRole: z.string().max(40).optional(),
        scheduledAt: z.string().datetime().optional(),
        templateName: z.string().max(100).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const result = await (supabaseAdmin as any)
      .from("notification_broadcasts")
      .insert({
        idempotency_key: crypto.randomUUID(),
        title: data.title,
        message: data.message,
        target_kind: data.targetKind,
        target_id: data.targetId ?? null,
        target_role: data.targetRole ?? null,
        target_audience: data.targetKind === "broadcast" ? "all" : null,
        status: data.scheduledAt ? "scheduled" : "draft",
        scheduled_at: data.scheduledAt ?? null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (missingTable(result.error))
      return { available: false as const, message: MODULE_UNAVAILABLE, id: null };
    if (result.error) throw new Error(result.error.message);
    if (data.templateName) {
      const template = await (supabaseAdmin as any).from("notification_templates").upsert(
        {
          name: data.templateName,
          title: data.title,
          message: data.message,
          created_by: context.userId,
        },
        { onConflict: "name" },
      );
      if (template.error) throw new Error(template.error.message);
    }
    await audit(
      context.userId,
      "NOTIFICATION_CREATED",
      "notification_broadcasts",
      result.data.id,
      data,
    );
    return { available: true as const, message: null, id: result.data.id as string };
  });

export const adminPhase2DashboardMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const definitions = [
      ["orders", "wholesale_orders"],
      ["disputes", "order_disputes"],
      ["reports", "moderation_reports"],
      ["notifications", "notification_broadcasts"],
      ["listings", "listings"],
      ["stores", "stores"],
    ] as const;
    const metrics: Record<string, number | null> = {};
    for (const [key, table] of definitions) {
      const result = await (supabaseAdmin as any)
        .from(table)
        .select("id", { count: "exact", head: true });
      metrics[key] = missingTable(result.error) ? null : result.error ? null : (result.count ?? 0);
    }
    return metrics;
  });

export const adminSettingsHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const result = await (supabaseAdmin as any)
      .from("platform_settings_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);
    if (missingTable(result.error))
      return { available: false as const, message: MODULE_UNAVAILABLE, rows: [] };
    if (result.error) throw new Error(result.error.message);
    return { available: true as const, message: null, rows: (result.data ?? []) as Json[] };
  });
