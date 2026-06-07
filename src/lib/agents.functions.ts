import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  headline_ar: z.string().max(200).optional().nullable(),
  headline_en: z.string().max(200).optional().nullable(),
  bio_ar: z.string().max(4000).optional().nullable(),
  bio_en: z.string().max(4000).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  specialties: z.array(z.string().max(60)).max(20).default([]),
  languages: z.array(z.string().max(60)).max(10).default([]),
});

export const getMyAgent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("agents").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    return { agent: data };
  });

export const upsertMyAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const payload = { ...data, user_id: userId };
    const { data: existing } = await supabase
      .from("agents").select("id").eq("user_id", userId).maybeSingle();
    if (existing) {
      const { error } = await supabase.from("agents").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: existing.id, created: false };
    }
    const { data: row, error } = await supabase.from("agents").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id, created: true };
  });
