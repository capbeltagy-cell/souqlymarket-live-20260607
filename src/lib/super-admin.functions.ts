import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ALLOWED = ["capbeltagy@gmail.com", "capbeltagy95@gmail.com"];

async function assertSuper(ctx: { userId: string; supabase: any }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(ctx.userId);
  if (error || !data?.user) throw new Error("Unauthorized");
  const email = (data.user.email ?? "").toLowerCase();
  if (!ALLOWED.includes(email)) throw new Error("Access denied");
  // ensure admin role
  await supabaseAdmin.from("user_roles").upsert({ user_id: ctx.userId, role: "admin" }, { onConflict: "user_id,role" });
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
    const tables = ["companies", "agents", "listings", "leads", "rfqs", "wholesale_listings", "factories", "tenders", "subscriptions", "company_referrals", "user_roles", "profiles"];
    const out: Record<string, number> = {};
    for (const t of tables) {
      const { count } = await admin.from(t).select("id", { count: "exact", head: true });
      out[t] = count ?? 0;
    }
    const { count: paid } = await admin.from("companies").select("id", { count: "exact", head: true }).eq("subscription_plan", "paid");
    const { count: verified } = await admin.from("companies").select("id", { count: "exact", head: true }).eq("is_verified", true);
    const { count: featured } = await admin.from("listings").select("id", { count: "exact", head: true }).eq("featured", true);
    return { counts: out, paidCompanies: paid ?? 0, verifiedCompanies: verified ?? 0, featuredListings: featured ?? 0 };
  });

export const superList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { entity: string; limit?: number }) =>
    z.object({ entity: z.enum(["companies", "users", "agents", "listings", "leads", "rfqs", "wholesale_listings", "factories", "tenders", "subscriptions", "company_referrals"]), limit: z.number().min(1).max(200).default(100) }).parse(d))
  .handler(async ({ context, data }) => {
    const admin = await assertSuper(context);
    if (data.entity === "users") {
      const { data: users } = await admin.auth.admin.listUsers({ perPage: data.limit });
      return users?.users?.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at, banned_until: (u as any).banned_until })) ?? [];
    }
    const { data: rows, error } = await admin.from(data.entity).select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (error) throw error;
    return rows ?? [];
  });

export const superAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { action: string; entity?: string; id?: string; payload?: Record<string, any> }) =>
    z.object({
      action: z.enum([
        "verify_company", "unverify_company", "mark_paid", "mark_unpaid",
        "feature_listing", "unfeature_listing", "approve_listing", "reject_listing", "hide_listing",
        "delete", "ban_user", "unban_user",
      ]),
      entity: z.string().optional(),
      id: z.string().uuid().optional(),
      payload: z.record(z.string(), z.any()).optional(),
    }).parse(d))
  .handler(async ({ context, data }) => {
    const admin = await assertSuper(context);
    const id = data.id!;
    switch (data.action) {
      case "verify_company":
        await admin.from("companies").update({ is_verified: true }).eq("id", id); break;
      case "unverify_company":
        await admin.from("companies").update({ is_verified: false }).eq("id", id); break;
      case "mark_paid":
        await admin.from("companies").update({ subscription_plan: "paid", subscription_expires_at: new Date(Date.now() + 30 * 86400000).toISOString() }).eq("id", id); break;
      case "mark_unpaid":
        await admin.from("companies").update({ subscription_plan: "free", subscription_expires_at: null }).eq("id", id); break;
      case "feature_listing": {
        const days = (data.payload?.days as number) ?? 7;
        await admin.from("listings").update({ featured: true, featured_until: new Date(Date.now() + days * 86400000).toISOString() }).eq("id", id);
        break;
      }
      case "unfeature_listing":
        await admin.from("listings").update({ featured: false, featured_until: null }).eq("id", id); break;
      case "approve_listing":
        await admin.from("listings").update({ status: "approved" }).eq("id", id); break;
      case "reject_listing":
        await admin.from("listings").update({ status: "rejected" }).eq("id", id); break;
      case "hide_listing":
        await admin.from("listings").update({ status: "hidden" }).eq("id", id); break;
      case "delete": {
        if (!data.entity) throw new Error("entity required");
        await admin.from(data.entity).delete().eq("id", id);
        break;
      }
      case "ban_user":
        await admin.auth.admin.updateUserById(id, { ban_duration: "8760h" }); break;
      case "unban_user":
        await admin.auth.admin.updateUserById(id, { ban_duration: "none" }); break;
    }
    return { ok: true };
  });
