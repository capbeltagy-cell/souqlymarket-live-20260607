import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Ensures a conversation exists between the caller (buyer) and the listing's company owner (seller).
export const startConversationForListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ listing_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: listing, error: le } = await supabase
      .from("listings")
      .select("id, company_id")
      .eq("id", data.listing_id)
      .maybeSingle();
    if (le) throw le;
    if (!listing?.company_id) throw new Error("Listing has no company");
    const { data: company, error: ce } = await supabase
      .from("companies")
      .select("owner_id")
      .eq("id", listing.company_id)
      .maybeSingle();
    if (ce) throw ce;
    if (!company?.owner_id) throw new Error("Company owner not found");
    if (company.owner_id === userId) throw new Error("لا يمكنك مراسلة نفسك");

    const { data: existing } = await (supabase.from("conversations" as never) as any)
      .select("id")
      .eq("listing_id", data.listing_id)
      .eq("buyer_id", userId)
      .eq("seller_id", company.owner_id)
      .maybeSingle();
    if (existing?.id) return { id: existing.id as string };

    const { data: created, error: xe } = await (supabase.from("conversations" as never) as any)
      .insert({ listing_id: data.listing_id, buyer_id: userId, seller_id: company.owner_id })
      .select("id")
      .single();
    if (xe) throw xe;
    return { id: created.id as string };
  });
