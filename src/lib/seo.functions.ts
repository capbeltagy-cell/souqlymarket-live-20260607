import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public read-only meta helpers using the admin client (RLS-safe — we project only public columns).
export const getListingMeta = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("listings")
      .select(
        "id, title_ar, title_en, description_ar, description_en, images, type, country, city, price, currency",
      )
      .eq("id", data.id)
      .eq("status", "approved")
      .maybeSingle();
    return row;
  });

export const getCompanyMeta = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("companies")
      .select(
        "id, name_ar, name_en, description_ar, description_en, logo_url, cover_url, country, city, industry, is_verified",
      )
      .eq("id", data.id)
      .maybeSingle();
    return row;
  });

export const getAgentMeta = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("agents")
      .select("id, headline_ar, headline_en, bio_ar, bio_en, country, city, user_id, is_verified")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return null;
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", row.user_id)
      .maybeSingle();
    return { ...row, full_name: prof?.full_name ?? null, avatar_url: prof?.avatar_url ?? null };
  });

export const getRfqMeta = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Public projection — exclude buyer_id and attachments; only open RFQs.
    const { data: row } = await supabaseAdmin
      .from("rfqs" as any)
      .select("id, title, description, governorate")
      .eq("id", data.id)
      .eq("status", "open")
      .maybeSingle();
    return row as any;
  });

export const getTenderMeta = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Only open tenders — exclude publisher_id.
    const { data: row } = await supabaseAdmin
      .from("tenders" as any)
      .select("id, title, description, governorate")
      .eq("id", data.id)
      .eq("status", "open")
      .maybeSingle();
    return row as any;
  });
