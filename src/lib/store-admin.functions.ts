import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: any) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const adminListStores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    status: z.enum(["all", "draft", "pending_review", "published", "suspended", "rejected"]).default("all"),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = (supabaseAdmin.from("stores" as never) as any).select("*").order("created_at", { ascending: false }).limit(500);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: items } = await q;
    return { items: items ?? [] };
  });

const actionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "reject", "suspend", "unsuspend", "verify", "unverify", "feature", "unfeature"]),
  reason: z.string().max(500).optional().nullable(),
});

export const adminUpdateStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => actionSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
    };
    switch (data.action) {
      case "approve": patch.status = "published"; patch.rejection_reason = null; break;
      case "reject": patch.status = "rejected"; patch.rejection_reason = data.reason ?? null; break;
      case "suspend": patch.status = "suspended"; patch.rejection_reason = data.reason ?? null; break;
      case "unsuspend": patch.status = "published"; break;
      case "verify": patch.is_verified = true; break;
      case "unverify": patch.is_verified = false; break;
      case "feature": patch.is_featured = true; break;
      case "unfeature": patch.is_featured = false; break;
    }
    const { data: store, error } = await (supabaseAdmin.from("stores" as never) as any)
      .update(patch).eq("id", data.id).select("owner_id, name_ar, slug").maybeSingle();
    if (error) throw new Error(error.message);
    if (store?.owner_id && ["approve", "reject", "suspend"].includes(data.action)) {
      const title = data.action === "approve" ? "تم نشر متجرك" : data.action === "reject" ? "تم رفض متجرك" : "تم إيقاف متجرك";
      const body = data.action === "approve"
        ? `متجرك ${store.name_ar} أصبح متاحًا للجميع`
        : (data.reason ?? "يرجى التواصل مع الدعم");
      const link = data.action === "approve" ? `/stores/${store.slug}` : "/store";
      await (supabaseAdmin.from("notifications" as never) as any).insert({
        user_id: store.owner_id, type: "store", title, body, link,
      });
    }
    return { ok: true };
  });
