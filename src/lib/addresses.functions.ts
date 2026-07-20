import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const addressInput = z.object({
  id: z.string().uuid().optional().nullable(),
  label: z.string().max(80).optional().nullable(),
  recipient_name: z.string().min(2).max(120),
  phone: z.string().min(6).max(30),
  governorate: z.string().min(1).max(120),
  city: z.string().min(1).max(120),
  address_line: z.string().min(3).max(500),
  is_default: z.boolean().optional(),
});

export const listMyAddresses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveMyAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => addressInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const payload = {
      user_id: userId,
      label: data.label ?? null,
      recipient_name: data.recipient_name,
      phone: data.phone,
      governorate: data.governorate,
      city: data.city,
      address_line: data.address_line,
      is_default: !!data.is_default,
    };
    // If setting as default, unset others first
    if (data.is_default) {
      await supabase.from("user_addresses").update({ is_default: false }).eq("user_id", userId);
    }
    let id = data.id ?? null;
    if (id) {
      const { error } = await supabase
        .from("user_addresses")
        .update(payload)
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    } else {
      // Auto-default if first address
      const { count } = await supabase
        .from("user_addresses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (!count) payload.is_default = true;
      const { data: created, error } = await supabase
        .from("user_addresses")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      id = created.id as string;
    }
    return { id: id! };
  });

export const deleteMyAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_addresses")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
