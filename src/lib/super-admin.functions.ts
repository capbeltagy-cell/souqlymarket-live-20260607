import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ADMIN_ENTITIES = [
  "companies",
  "agents",
  "listings",
  "leads",
  "rfqs",
  "wholesale_listings",
  "factories",
  "tenders",
  "subscriptions",
  "company_referrals",
] as const;

type AdminEntity = (typeof ADMIN_ENTITIES)[number];

async function assertSuper(ctx: { userId: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roles, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .in("role", ["super_admin"]);
  if (error || !roles?.length) throw new Error("لا تملك صلاحية مدير النظام.");
  return supabaseAdmin;
}

export const superCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuper(context);
    return { ok: true };
  });

export const superOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertSuper(context);
    const tables = [
      "companies",
      "agents",
      "listings",
      "leads",
      "rfqs",
      "wholesale_listings",
      "factories",
      "tenders",
      "subscriptions",
      "company_referrals",
      "user_roles",
      "profiles",
    ] as const;
    const out: Record<string, number> = {};
    for (const t of tables) {
      const { count } = await countAdminRows(admin, t);
      out[t] = count ?? 0;
    }
    const { count: paid } = await admin
      .from("companies")
      .select("id", { count: "exact", head: true })
      .eq("subscription_plan", "premium_company");
    const { count: verified } = await admin
      .from("companies")
      .select("id", { count: "exact", head: true })
      .eq("is_verified", true);
    const { count: featured } = await admin
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("featured", true);
    return {
      counts: out,
      paidCompanies: paid ?? 0,
      verifiedCompanies: verified ?? 0,
      featuredListings: featured ?? 0,
    };
  });

export const superList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { entity: string; limit?: number }) =>
    z
      .object({
        entity: z.enum([
          "companies",
          "users",
          "agents",
          "listings",
          "leads",
          "rfqs",
          "wholesale_listings",
          "factories",
          "tenders",
          "subscriptions",
          "company_referrals",
        ]),
        limit: z.number().min(1).max(200).default(100),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const admin = await assertSuper(context);
    if (data.entity === "users") {
      const { data: users } = await admin.auth.admin.listUsers({ perPage: data.limit });
      return (
        users?.users?.map((user) => ({
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          banned_until: user.banned_until,
        })) ?? []
      );
    }
    if (data.entity === "factories") {
      const { data: rows, error } = await admin
        .from("factories")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(data.limit);
      if (error) throw error;
      return (rows ?? []).map((row) => ({ ...row, id: row.company_id }));
    }
    const { data: rows, error } = await listAdminRows(admin, data.entity, data.limit);
    if (error) throw error;
    return rows ?? [];
  });

export const superAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        action: z.enum([
          "verify_company",
          "unverify_company",
          "mark_paid",
          "mark_unpaid",
          "feature_listing",
          "unfeature_listing",
          "approve_listing",
          "reject_listing",
          "hide_listing",
          "delete",
          "ban_user",
          "unban_user",
        ]),
        entity: z.string().optional(),
        id: z.string().uuid().optional(),
        payload: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const admin = await assertSuper(context);
    const id = data.id!;
    switch (data.action) {
      case "verify_company":
        await admin.from("companies").update({ is_verified: true }).eq("id", id);
        break;
      case "unverify_company":
        await admin.from("companies").update({ is_verified: false }).eq("id", id);
        break;
      case "mark_paid":
        await admin
          .from("companies")
          .update({
            subscription_plan: "premium_company",
            subscription_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
          })
          .eq("id", id);
        break;
      case "mark_unpaid":
        await admin
          .from("companies")
          .update({ subscription_plan: "free", subscription_expires_at: null })
          .eq("id", id);
        break;
      case "feature_listing": {
        const days = (data.payload?.days as number) ?? 7;
        await admin
          .from("listings")
          .update({
            featured: true,
            featured_until: new Date(Date.now() + days * 86400000).toISOString(),
          })
          .eq("id", id);
        break;
      }
      case "unfeature_listing":
        await admin.from("listings").update({ featured: false, featured_until: null }).eq("id", id);
        break;
      case "approve_listing":
        await admin.from("listings").update({ status: "approved" }).eq("id", id);
        break;
      case "reject_listing":
        await admin.from("listings").update({ status: "rejected" }).eq("id", id);
        break;
      case "hide_listing":
        await admin.from("listings").update({ status: "draft" }).eq("id", id);
        break;
      case "delete": {
        if (!data.entity) throw new Error("entity required");
        if (!ADMIN_ENTITIES.includes(data.entity as AdminEntity)) {
          throw new Error("نوع السجل غير مدعوم.");
        }
        await deleteAdminRow(admin, data.entity as AdminEntity, id);
        break;
      }
      case "ban_user":
        await admin.auth.admin.updateUserById(id, { ban_duration: "8760h" });
        break;
      case "unban_user":
        await admin.auth.admin.updateUserById(id, { ban_duration: "none" });
        break;
    }
    return { ok: true };
  });

type AdminClient = Awaited<ReturnType<typeof assertSuper>>;

async function countAdminRows(admin: AdminClient, table: AdminEntity | "user_roles" | "profiles") {
  switch (table) {
    case "companies":
      return admin.from("companies").select("id", { count: "exact", head: true });
    case "agents":
      return admin.from("agents").select("id", { count: "exact", head: true });
    case "listings":
      return admin.from("listings").select("id", { count: "exact", head: true });
    case "leads":
      return admin.from("leads").select("id", { count: "exact", head: true });
    case "rfqs":
      return admin.from("rfqs").select("id", { count: "exact", head: true });
    case "wholesale_listings":
      return admin.from("wholesale_listings").select("id", { count: "exact", head: true });
    case "factories":
      return admin.from("factories").select("id", { count: "exact", head: true });
    case "tenders":
      return admin.from("tenders").select("id", { count: "exact", head: true });
    case "subscriptions":
      return admin.from("subscriptions").select("id", { count: "exact", head: true });
    case "company_referrals":
      return admin.from("company_referrals").select("id", { count: "exact", head: true });
    case "user_roles":
      return admin.from("user_roles").select("id", { count: "exact", head: true });
    case "profiles":
      return admin.from("profiles").select("id", { count: "exact", head: true });
  }
}

function listAdminRows(admin: AdminClient, table: AdminEntity, limit: number) {
  switch (table) {
    case "companies":
      return admin
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
    case "agents":
      return admin
        .from("agents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
    case "listings":
      return admin
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
    case "leads":
      return admin.from("leads").select("*").order("created_at", { ascending: false }).limit(limit);
    case "rfqs":
      return admin.from("rfqs").select("*").order("created_at", { ascending: false }).limit(limit);
    case "wholesale_listings":
      return admin
        .from("wholesale_listings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
    case "factories":
      return admin
        .from("factories")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
    case "tenders":
      return admin
        .from("tenders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
    case "subscriptions":
      return admin
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
    case "company_referrals":
      return admin
        .from("company_referrals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
  }
}

async function deleteAdminRow(admin: AdminClient, table: AdminEntity, id: string) {
  switch (table) {
    case "companies":
      return admin.from("companies").delete().eq("id", id);
    case "agents":
      return admin.from("agents").delete().eq("id", id);
    case "listings":
      return admin.from("listings").delete().eq("id", id);
    case "leads":
      return admin.from("leads").delete().eq("id", id);
    case "rfqs":
      return admin.from("rfqs").delete().eq("id", id);
    case "wholesale_listings":
      return admin.from("wholesale_listings").delete().eq("id", id);
    case "factories":
      return admin.from("factories").delete().eq("company_id", id);
    case "tenders":
      return admin.from("tenders").delete().eq("id", id);
    case "subscriptions":
      return admin.from("subscriptions").delete().eq("id", id);
    case "company_referrals":
      return admin.from("company_referrals").delete().eq("id", id);
  }
}
