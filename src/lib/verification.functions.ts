import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listVerificationQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admin only");
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name_en, name_ar, country, industry, is_verified, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    const { data: agents } = await supabase
      .from("agents")
      .select("id, headline_en, headline_ar, country, is_verified, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(100);
    return { companies: companies ?? [], agents: agents ?? [] };
  });

export const setCompanyVerified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), verified: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("companies")
      .update({ is_verified: data.verified })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setAgentVerified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), verified: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("agents")
      .update({ is_verified: data.verified })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
