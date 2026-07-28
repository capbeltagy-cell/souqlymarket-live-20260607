import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({ id: z.string().uuid() });

export const getPublicAgentProfile = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => input.parse(value))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: agent, error } = await supabaseAdmin
      .from("agents")
      .select(
        "id, user_id, headline_ar, headline_en, bio_ar, bio_en, country, city, specialties, languages, is_verified, is_trusted, is_premium",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error("تعذّر تحميل ملف المسوق");
    if (!agent) return { agent: null, profile: null };

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, display_name, avatar_url, phone_verified")
      .eq("id", agent.user_id)
      .maybeSingle();
    if (profileError) throw new Error("تعذّر تحميل الملف العام للمسوق");

    return { agent, profile: profile ?? null };
  });
