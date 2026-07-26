import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { canManageRoles, canRemoveRole, hasPlatformAdminAccess } from "@/lib/admin-permissions";

const assignableRoles = [
  "super_admin",
  "admin",
  "moderator",
  "finance_admin",
  "support_admin",
  "company",
  "agent",
  "customer",
  "buyer",
] as const;

async function getActorRoles(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => String(row.role));
}

async function requireAdmin(userId: string) {
  const roles = await getActorRoles(userId);
  if (!hasPlatformAdminAccess(roles)) throw new Error("Forbidden");
  return roles;
}

async function writeAudit(
  actorId: string,
  action: string,
  recordId: string,
  oldData: Json | null,
  newData: Json | null,
) {
  const { error } = await supabaseAdmin.from("audit_logs").insert({
    user_id: actorId,
    action,
    table_name: "user_roles",
    record_id: recordId,
    old_data: oldData,
    new_data: newData,
  });
  if (error) throw new Error(error.message);
}

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(10).max(100).default(20),
        search: z.string().trim().max(120).default(""),
        role: z.enum(assignableRoles).optional(),
        status: z.enum(["active", "suspended"]).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const result = await supabaseAdmin.auth.admin.listUsers({
      page: data.page,
      perPage: data.pageSize,
    });
    if (result.error) throw new Error(result.error.message);

    const ids = result.data.users.map((user) => user.id);
    const [profilesResult, rolesResult, companiesResult, storesResult] = await Promise.all([
      ids.length
        ? supabaseAdmin.from("profiles").select("id, full_name, phone, created_at").in("id", ids)
        : Promise.resolve({ data: [], error: null }),
      ids.length
        ? supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids)
        : Promise.resolve({ data: [], error: null }),
      ids.length
        ? supabaseAdmin.from("companies").select("owner_id").in("owner_id", ids)
        : Promise.resolve({ data: [], error: null }),
      ids.length
        ? supabaseAdmin.from("stores").select("owner_id").in("owner_id", ids)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const firstError = [profilesResult, rolesResult, companiesResult, storesResult].find(
      (entry) => entry.error,
    )?.error;
    if (firstError) throw new Error(firstError.message);

    const profileMap = new Map((profilesResult.data ?? []).map((row) => [row.id, row]));
    const roleMap = new Map<string, string[]>();
    for (const row of rolesResult.data ?? []) {
      roleMap.set(row.user_id, [...(roleMap.get(row.user_id) ?? []), String(row.role)]);
    }
    const countByOwner = (rows: Array<{ owner_id: string }>) => {
      const map = new Map<string, number>();
      for (const row of rows) map.set(row.owner_id, (map.get(row.owner_id) ?? 0) + 1);
      return map;
    };
    const companyCounts = countByOwner(companiesResult.data ?? []);
    const storeCounts = countByOwner(storesResult.data ?? []);

    let users = result.data.users.map((user) => {
      const profile = profileMap.get(user.id);
      return {
        id: user.id,
        email: user.email ?? "",
        name: profile?.full_name ?? "",
        phone: profile?.phone ?? user.phone ?? "",
        roles: roleMap.get(user.id) ?? [],
        status:
          user.banned_until && new Date(user.banned_until) > new Date() ? "suspended" : "active",
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        companiesCount: companyCounts.get(user.id) ?? 0,
        storesCount: storeCounts.get(user.id) ?? 0,
      };
    });
    if (data.search) {
      const search = data.search.toLocaleLowerCase("ar");
      users = users.filter((user) =>
        [user.email, user.name, user.phone].some((value) =>
          value.toLocaleLowerCase("ar").includes(search),
        ),
      );
    }
    if (data.role) users = users.filter((user) => user.roles.includes(data.role!));
    if (data.status) users = users.filter((user) => user.status === data.status);
    return {
      users,
      total: result.data.total ?? users.length,
      page: data.page,
      pageSize: data.pageSize,
    };
  });

export const adminSetUserSuspended = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), suspended: z.boolean() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const actorRoles = await requireAdmin(context.userId);
    if (!canManageRoles(actorRoles)) throw new Error("Forbidden");
    if (data.userId === context.userId && data.suspended) throw new Error("لا يمكنك إيقاف حسابك");
    const result = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.suspended ? "876000h" : "none",
    });
    if (result.error) throw new Error(result.error.message);
    await writeAudit(
      context.userId,
      data.suspended ? "USER_SUSPENDED" : "USER_REACTIVATED",
      data.userId,
      null,
      {
        suspended: data.suspended,
      },
    );
    return { ok: true };
  });

export const adminSetUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ userId: z.string().uuid(), role: z.enum(assignableRoles), enabled: z.boolean() })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const actorRoles = await requireAdmin(context.userId);
    if (!canManageRoles(actorRoles)) throw new Error("Forbidden");
    if (data.role === "super_admin" && !actorRoles.includes("super_admin"))
      throw new Error("Forbidden");
    if (!data.enabled && data.role === "super_admin") {
      const { count, error } = await supabaseAdmin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "super_admin");
      if (error) throw new Error(error.message);
      if (!canRemoveRole(data.role, count ?? 0)) throw new Error("لا يمكن إزالة آخر مدير عام");
    }
    if (data.enabled) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role as never }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role as never);
      if (error) throw new Error(error.message);
    }
    await writeAudit(
      context.userId,
      data.enabled ? "ROLE_ASSIGNED" : "ROLE_REMOVED",
      data.userId,
      null,
      {
        role: data.role,
        enabled: data.enabled,
      },
    );
    return { ok: true };
  });

export const adminListAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(10).max(100).default(30),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const from = (data.page - 1) * data.pageSize;
    const {
      data: rows,
      count,
      error,
    } = await supabaseAdmin
      .from("audit_logs")
      .select("id, user_id, action, table_name, record_id, old_data, new_data, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(from, from + data.pageSize - 1);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const adminGetSystemStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const startedAt = Date.now();
    const [database, maintenance] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).limit(1),
      supabaseAdmin.from("platform_settings").select("*").eq("id", true).maybeSingle(),
    ]);
    return {
      database: database.error ? "error" : "healthy",
      auth: "healthy",
      responseMs: Date.now() - startedAt,
      maintenanceMode: Boolean(
        maintenance.data &&
        "maintenance_mode" in maintenance.data &&
        maintenance.data.maintenance_mode,
      ),
      environment: process.env.NODE_ENV ?? "production",
      checkedAt: new Date().toISOString(),
    };
  });
