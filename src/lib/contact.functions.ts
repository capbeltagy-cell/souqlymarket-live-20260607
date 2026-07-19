import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().min(2).max(150),
  message: z.string().trim().min(10).max(2000),
  website: z.string().max(0).optional().default(""),
});

export const submitContactRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => contactSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    // A small database-backed throttle prevents repeated submissions without
    // exposing the support table or service key to the browser.
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count, error: countError } = await admin
      .from("contact_submissions")
      .select("id", { count: "exact", head: true })
      .eq("email", data.email.toLowerCase())
      .gte("created_at", since);
    if (countError) throw new Error("تعذر إرسال الرسالة الآن. حاول مرة أخرى لاحقاً.");
    if ((count ?? 0) >= 3) throw new Error("تم استلام عدة رسائل منك. حاول مرة أخرى بعد 10 دقائق.");

    const { error } = await admin.from("contact_submissions").insert({
      name: data.name,
      email: data.email.toLowerCase(),
      subject: data.subject,
      message: data.message,
      status: "new",
    });
    if (error) throw new Error("تعذر إرسال الرسالة الآن. حاول مرة أخرى لاحقاً.");
    return { ok: true as const };
  });
