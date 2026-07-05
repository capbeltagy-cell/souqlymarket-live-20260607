import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleSchema = z.object({ role: z.enum(["company", "agent"]) });

/**
 * Assigns a role (company or agent) to the current authenticated user.
 * Admin role can never be self-assigned. Uses service role because the
 * `user_roles` table only allows admins to insert via RLS.
 * Row scope is enforced explicitly via the authenticated userId.
 */
export const chooseMyRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => roleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { ok: true as const, role: data.role };
  });
