import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* New ERP tables are shipped by migration and intentionally typed locally until
 * Supabase production applies the migration and generated types are refreshed. */
/* eslint-disable @typescript-eslint/no-explicit-any */

export type CompanyWorkspaceAccess = {
  companyId: string;
  companyName: string;
  role: "owner" | "admin" | "manager" | "sales" | "inventory" | "viewer";
  permissions: string[];
  canManageMembers: boolean;
  canManageCrm: boolean;
  canManageInventory: boolean;
};

async function resolveWorkspace(
  supabase: any,
  userId: string,
): Promise<CompanyWorkspaceAccess | null> {
  const { data: owned } = await supabase
    .from("companies")
    .select("id, name_ar, name_en")
    .eq("owner_id", userId)
    .maybeSingle();

  if (owned) {
    return {
      companyId: owned.id,
      companyName: owned.name_ar || owned.name_en,
      role: "owner",
      permissions: [],
      canManageMembers: true,
      canManageCrm: true,
      canManageInventory: true,
    };
  }

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id, role, permissions, companies(name_ar, name_en)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) return null;
  const permissions = membership.permissions ?? [];
  const elevated = ["owner", "admin"].includes(membership.role);
  const manager = membership.role === "manager";
  const company = membership.companies;
  return {
    companyId: membership.company_id,
    companyName: company?.name_ar || company?.name_en || "مساحة الشركة",
    role: membership.role,
    permissions,
    canManageMembers: elevated || permissions.includes("members.manage"),
    canManageCrm:
      elevated || manager || membership.role === "sales" || permissions.includes("crm.manage"),
    canManageInventory:
      elevated ||
      manager ||
      membership.role === "inventory" ||
      permissions.includes("inventory.manage"),
  };
}

export const getMyCompanyWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspace = await resolveWorkspace(context.supabase, context.userId);
    if (!workspace) return { hasWorkspace: false as const, workspace: null };

    const db = context.supabase as any;
    const [{ count: members }, { count: leads }, { count: products }, { count: lowStock }] =
      await Promise.all([
        db
          .from("company_members")
          .select("id", { count: "exact", head: true })
          .eq("company_id", workspace.companyId)
          .eq("status", "active"),
        db
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("company_id", workspace.companyId),
        db
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("company_id", workspace.companyId)
          .eq("type", "product"),
        db
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("company_id", workspace.companyId)
          .eq("type", "product")
          .eq("track_inventory", true)
          .lte("stock_quantity", 5),
      ]);

    return {
      hasWorkspace: true as const,
      workspace,
      stats: {
        members: members ?? 0,
        leads: leads ?? 0,
        products: products ?? 0,
        lowStock: lowStock ?? 0,
      },
    };
  });

export const listCompanyMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspace = await resolveWorkspace(context.supabase, context.userId);
    if (!workspace) throw new Error("لا توجد شركة مرتبطة بهذا الحساب.");
    const db = context.supabase as any;
    const { data, error } = await db
      .from("company_members")
      .select("id, user_id, role, permissions, status, joined_at")
      .eq("company_id", workspace.companyId)
      .order("joined_at");
    if (error) throw new Error("تعذر تحميل أعضاء الشركة.");

    const userIds = (data ?? []).map((member: any) => member.user_id);
    const { data: profiles } = userIds.length
      ? await db
          .from("profiles")
          .select("id, full_name, display_name, avatar_url")
          .in("id", userIds)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return {
      workspace,
      members: (data ?? []).map((member: any) => ({
        ...member,
        profile: profileMap.get(member.user_id) ?? null,
      })),
    };
  });

const updateMemberSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(["admin", "manager", "sales", "inventory", "viewer"]),
  status: z.enum(["active", "suspended"]),
});

export const updateCompanyMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateMemberSchema.parse(input))
  .handler(async ({ data, context }) => {
    const workspace = await resolveWorkspace(context.supabase, context.userId);
    if (!workspace?.canManageMembers) throw new Error("لا تملك صلاحية إدارة أعضاء الشركة.");
    const db = context.supabase as any;
    const { data: member } = await db
      .from("company_members")
      .select("id, company_id, role")
      .eq("id", data.memberId)
      .eq("company_id", workspace.companyId)
      .maybeSingle();
    if (!member || member.role === "owner") throw new Error("لا يمكن تعديل هذا العضو.");
    const { error } = await db
      .from("company_members")
      .update({ role: data.role, status: data.status, updated_at: new Date().toISOString() })
      .eq("id", member.id);
    if (error) throw new Error("تعذر تحديث صلاحيات العضو.");
    return { success: true };
  });

export { resolveWorkspace };
