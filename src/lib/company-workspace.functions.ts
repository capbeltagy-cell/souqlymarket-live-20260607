import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { asErpClient } from "@/lib/company-erp.database";

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
  supabase: SupabaseClient<Database>,
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

  const db = asErpClient(supabase);
  const { data: membership } = await db
    .from("company_members")
    .select("company_id, role, permissions")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) return null;
  const permissions = membership.permissions ?? [];
  const elevated = ["owner", "admin"].includes(membership.role);
  const manager = membership.role === "manager";
  const { data: company } = await supabase
    .from("companies")
    .select("name_ar, name_en")
    .eq("id", membership.company_id)
    .maybeSingle();
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

    const db = asErpClient(context.supabase);
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
    const db = asErpClient(context.supabase);
    const { data, error } = await db
      .from("company_members")
      .select("id, user_id, role, permissions, status, joined_at")
      .eq("company_id", workspace.companyId)
      .order("joined_at");
    if (error) throw new Error("تعذر تحميل أعضاء الشركة.");

    const userIds = (data ?? []).map((member) => member.user_id);
    const { data: profiles } = userIds.length
      ? await db
          .from("profiles")
          .select("id, full_name, display_name, avatar_url")
          .in("id", userIds)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    const { data: invitations } = workspace.canManageMembers
      ? await db
          .from("company_invitations")
          .select("id, email, role, status, expires_at, created_at")
          .eq("company_id", workspace.companyId)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
      : { data: [] };
    return {
      workspace,
      members: (data ?? []).map((member) => ({
        ...member,
        profile: profileMap.get(member.user_id) ?? null,
      })),
      invitations: invitations ?? [],
    };
  });

const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((email) => email.toLowerCase()),
  role: z.enum(["admin", "manager", "sales", "inventory", "viewer"]),
});

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const inviteCompanyMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const workspace = await resolveWorkspace(context.supabase, context.userId);
    if (!workspace?.canManageMembers) throw new Error("لا تملك صلاحية دعوة أعضاء للشركة.");
    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
    const tokenHash = await sha256(token);
    const db = asErpClient(context.supabase);
    const { error } = await db.from("company_invitations").insert({
      company_id: workspace.companyId,
      email: data.email,
      role: data.role,
      token_hash: tokenHash,
      invited_by: context.userId,
    });
    if (error?.code === "23505") throw new Error("توجد دعوة معلقة لهذا البريد بالفعل.");
    if (error) throw new Error("تعذر إنشاء دعوة العضو.");
    return { invitationPath: `/company-invitations/${token}` };
  });

export const revokeCompanyInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ invitationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const workspace = await resolveWorkspace(context.supabase, context.userId);
    if (!workspace?.canManageMembers) throw new Error("لا تملك صلاحية إلغاء الدعوات.");
    const db = asErpClient(context.supabase);
    const { error } = await db
      .from("company_invitations")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("id", data.invitationId)
      .eq("company_id", workspace.companyId)
      .eq("status", "pending");
    if (error) throw new Error("تعذر إلغاء الدعوة.");
    return { success: true };
  });

export const acceptCompanyInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ token: z.string().min(32).max(256) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = asErpClient(context.supabase);
    const { data: companyId, error } = await db.rpc("accept_company_invitation", {
      _token: data.token,
    });
    if (error?.message?.includes("invitation_expired")) throw new Error("انتهت صلاحية هذه الدعوة.");
    if (error?.message?.includes("invitation_email_mismatch"))
      throw new Error("هذه الدعوة مخصصة لبريد إلكتروني آخر.");
    if (error) throw new Error("الدعوة غير صالحة أو تم استخدامها مسبقًا.");
    return { companyId };
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
    const db = asErpClient(context.supabase);
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
