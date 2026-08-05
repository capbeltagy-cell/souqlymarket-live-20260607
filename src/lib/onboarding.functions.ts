import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleSchema = z.object({ role: z.literal("company") });

/**
 * Legacy endpoint kept for old clients. Company roles are no longer
 * self-assignable: payment review and admin approval grant the role.
 */
export const chooseMyRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => roleSchema.parse(data))
  .handler(async () => {
    throw new Error("صلاحية الشركة تُفعّل بعد الدفع وموافقة الإدارة");
  });
