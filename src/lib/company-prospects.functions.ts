import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const statusSchema = z.enum([
  "new",
  "not_contacted",
  "whatsapp_sent",
  "email_sent",
  "called",
  "interested",
  "follow_up",
  "joined",
  "rejected",
  "invalid",
]);

const prospectSchema = z.object({
  name_ar: z.string().trim().min(2).max(200),
  name_en: z.string().trim().max(200).optional().nullable(),
  industry: z.string().trim().max(120).optional().nullable(),
  governorate: z.string().trim().max(100).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  industrial_zone: z.string().trim().max(120).optional().nullable(),
  website: z.string().trim().max(500).optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(40).optional().nullable(),
  whatsapp: z.string().trim().max(40).optional().nullable(),
  facebook_url: z.string().trim().max(500).optional().nullable(),
  linkedin_url: z.string().trim().max(500).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  source_name: z.string().trim().max(200).optional().nullable(),
  source_url: z.string().trim().max(500).optional().nullable(),
  contact_person: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
});

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("غير مصرح لك بإدارة قاعدة الشركات");
  return supabaseAdmin;
}

export const listCompanyProspects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        search: z.string().max(200).optional(),
        status: statusSchema.optional(),
        limit: z.number().int().min(1).max(500).default(100),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    let query = supabaseAdmin
      .from("company_prospects")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) query = query.eq("contact_status", data.status);
    if (data.search?.trim()) {
      const q = data.search.trim().replace(/[%_,]/g, " ");
      query = query.or(`name_ar.ilike.%${q}%,name_en.ilike.%${q}%,industry.ilike.%${q}%,city.ilike.%${q}%,phone.ilike.%${q}%`);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createCompanyProspect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => prospectSchema.parse(input))
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const score = [data.email, data.phone, data.website, data.industry, data.city].filter(Boolean).length * 20;
    const { data: row, error } = await supabaseAdmin
      .from("company_prospects")
      .insert({
        ...data,
        email: data.email || null,
        created_by: context.userId,
        data_quality_score: score,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.code === "23505" ? "الشركة مكررة بالبريد أو الهاتف" : error.message);
    return row;
  });

export const updateCompanyProspectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: statusSchema, note: z.string().max(2000).optional() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { data: current, error: currentError } = await supabaseAdmin
      .from("company_prospects")
      .select("contact_status")
      .eq("id", data.id)
      .single();
    if (currentError) throw new Error(currentError.message);
    const contacted = ["whatsapp_sent", "email_sent", "called", "interested", "follow_up", "joined"].includes(data.status);
    const { error } = await supabaseAdmin
      .from("company_prospects")
      .update({ contact_status: data.status, last_contacted_at: contacted ? new Date().toISOString() : undefined })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("company_prospect_activities").insert({
      prospect_id: data.id,
      activity_type: "status_change",
      old_status: current.contact_status,
      new_status: data.status,
      details: data.note || null,
      created_by: context.userId,
    });
    return { ok: true };
  });

export const scheduleCompanyProspectFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), at: z.string().datetime(), note: z.string().max(2000).optional() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("company_prospects")
      .update({ next_follow_up_at: data.at, contact_status: "follow_up" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("company_prospect_activities").insert({
      prospect_id: data.id,
      activity_type: "follow_up",
      new_status: "follow_up",
      details: data.note || null,
      created_by: context.userId,
    });
    return { ok: true };
  });
