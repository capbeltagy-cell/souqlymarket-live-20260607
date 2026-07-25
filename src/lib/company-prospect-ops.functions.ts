import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { asCompanyProspectClient } from "@/lib/company-prospect.database";

async function adminClient(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("غير مصرح لك");
  return asCompanyProspectClient(supabaseAdmin);
}

const rowSchema = z.object({
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
  source_name: z.string().trim().max(200).optional().nullable(),
  source_url: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const normalizePhone = (value?: string | null) => {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("20")) return `+${digits}`;
  if (digits.startsWith("0")) return `+20${digits.slice(1)}`;
  return digits ? `+${digits}` : null;
};

export const bulkImportCompanyProspects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ rows: z.array(rowSchema).min(1).max(500) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await adminClient(context.userId);
    const rows = data.rows.map((row) => {
      const phone = normalizePhone(row.phone);
      const whatsapp = normalizePhone(row.whatsapp || row.phone);
      const score =
        [row.email, phone, row.website, row.industry, row.city].filter(Boolean).length * 20;
      return {
        ...row,
        email: row.email || null,
        phone,
        whatsapp,
        contact_status: "not_contacted" as const,
        created_by: context.userId,
        data_quality_score: score,
        is_published: false,
      };
    });
    const { data: inserted, error } = await supabaseAdmin
      .from("company_prospects")
      .upsert(rows, { onConflict: "phone", ignoreDuplicates: true })
      .select("id");
    if (error) throw new Error(error.message);
    return {
      requested: rows.length,
      inserted: inserted?.length ?? 0,
      skipped: rows.length - (inserted?.length ?? 0),
    };
  });

export const deleteCompanyProspect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await adminClient(context.userId);
    const { error } = await supabaseAdmin.from("company_prospects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const requestCompanyClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        prospectId: z.string().uuid(),
        requesterName: z.string().trim().min(2).max(200),
        requesterPhone: z.string().trim().max(40).optional(),
        requesterEmail: z.string().trim().email().optional(),
        jobTitle: z.string().trim().max(120).optional(),
        evidenceUrl: z.string().trim().url().optional(),
        note: z.string().trim().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const prospectClient = asCompanyProspectClient(supabaseAdmin);
    const { error } = await prospectClient.from("company_claim_requests").upsert(
      {
        prospect_id: data.prospectId,
        requester_id: context.userId,
        requester_name: data.requesterName,
        requester_phone: normalizePhone(data.requesterPhone),
        requester_email: data.requesterEmail || null,
        job_title: data.jobTitle || null,
        evidence_url: data.evidenceUrl || null,
        note: data.note || null,
        status: "pending",
      },
      { onConflict: "prospect_id,requester_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCompanyClaimRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await adminClient(context.userId);
    const { data, error } = await supabaseAdmin
      .from("company_claim_requests")
      .select("*, company_prospects(name_ar,phone,email,website)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const reviewCompanyClaimRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["approved", "rejected"]),
        note: z.string().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await adminClient(context.userId);
    const { error } = await supabaseAdmin
      .from("company_claim_requests")
      .update({
        status: data.status,
        review_note: data.note || null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
