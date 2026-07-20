import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertNotPureMarketer } from "@/lib/marketer-guard";

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

/**
 * Owner-only read. Uses the service-role client so we can read the
 * privileged contact columns (email/phone/website) that are revoked
 * from anon/authenticated on the base table. Row scope is enforced
 * explicitly via `owner_id = userId`.
 */
export const getMyCompany = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { company: data };
  });

export const upsertMyCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    schema
      .extend({
        referral_code: z
          .string()
          .trim()
          .min(4)
          .max(40)
          .optional()
          .or(z.literal(""))
          .transform((v) => v || undefined),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertNotPureMarketer(supabase as never, userId);
    const { referral_code, ...companyData } = data;
    const payload = {
      ...companyData,
      website: companyData.website || null,
      email: companyData.email || null,
      owner_id: userId,
    };
    const { data: existing } = await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    let companyId: string;
    let created: boolean;
    if (existing) {
      const { error } = await supabase.from("companies").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
      companyId = existing.id;
      created = false;
    } else {
      const { data: row, error } = await supabase
        .from("companies")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      companyId = row.id;
      created = true;
    }
    if (referral_code) {
      // Best-effort attribution; RPC rejects self-referral, unknown codes,
      // and companies that are already attributed.
      await supabase.rpc("set_company_referrer", { _code: referral_code });
    }
    return { ok: true, id: companyId, created };
  });

/**
 * Contact-info reveal for a company profile. Only authenticated users
 * can see email/phone/website; anon visitors get nulls. Runs through
 * the service-role client because those columns are no longer readable
 * via the Data API.
 */
export const getCompanyContact = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("companies")
      .select("email, phone, website")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      email: row?.email ?? null,
      phone: row?.phone ?? null,
      website: row?.website ?? null,
    };
  });
