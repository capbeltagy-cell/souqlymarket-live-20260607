import { supabase } from "@/integrations/supabase/client";
import type { ListingCardData } from "@/components/ListingCard";

const listingCardSelect =
  "id, type, title_ar, title_en, images, price, currency, country, city, governorate, commission_percentage, featured, featured_until, marketer_promotion_enabled, promotion_status, leads_count, created_at, company_id, companies(name_ar, name_en, is_verified, is_premium)";

export async function getPublishedServices(limit = 48): Promise<ListingCardData[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const { data, error } = await supabase
    .from("listings")
    .select(listingCardSelect)
    .eq("status", "approved")
    .eq("visible_in_marketplace", true)
    .eq("type", "service")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;
  return (data ?? []) as unknown as ListingCardData[];
}
