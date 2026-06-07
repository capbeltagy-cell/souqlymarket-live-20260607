import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  name_ar: z.string().min(2).max(200),
  name_en: z.string().min(2).max(200),
  description_ar: z.string().max(4000).optional().nullable(),
  description_en: z.string().max(4000).optional().nullable(),
  industry: z.string().max(120).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("")),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(40).optional().nullable(),
  logo_url: z.string().optional().nullable(),
  cover_url: z.string().optional().nullable(),
});

export const getMyCompany = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("companies").select("*").eq("owner_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    return { company: data };
  });

export const upsertMyCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const payload = {
      ...data,
      website: data.website || null,
      email: data.email || null,
      owner_id: userId,
    };
    const { data: existing } = await supabase
      .from("companies").select("id").eq("owner_id", userId).maybeSingle();
    if (existing) {
      const { error } = await supabase.from("companies").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: existing.id, created: false };
    }
    const { data: row, error } = await supabase.from("companies").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id, created: true };
  });
