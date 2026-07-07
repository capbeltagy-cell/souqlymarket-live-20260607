
-- 1) Companies: revoke full-table SELECT from anon/authenticated, grant column-level SELECT
--    excluding email, phone, website. Owners/admins read those via server functions.
REVOKE SELECT ON public.companies FROM anon, authenticated;

GRANT SELECT (
  id, owner_id, name_ar, name_en, description_ar, description_en,
  logo_url, cover_url, industry, country, city,
  is_verified, subscription_plan, created_at, updated_at,
  subscription_expires_at, subscription_updated_at,
  governorate, company_type, category_slug, export_available,
  production_capacity, is_premium, referred_by_user_id, referred_by_code,
  source_name, source_url, import_batch_id, imported_by,
  is_launch_content, is_system
) ON public.companies TO anon, authenticated;

-- 2) Referrals: remove permissive public SELECT policies and scope reads.
DROP POLICY IF EXISTS "Referrals lookup by code" ON public.referrals;
DROP POLICY IF EXISTS "Referrals readable" ON public.referrals;

-- Company owners may read referrals for their own listings (needed by owner UI).
CREATE POLICY "Company owners read referrals for their listings"
ON public.referrals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.listings l
    JOIN public.companies c ON c.id = l.company_id
    WHERE l.id = referrals.listing_id AND c.owner_id = auth.uid()
  )
);
-- Existing "Agent manages own referrals" (FOR ALL to public) continues to cover agents.
-- Public /r/:code redirects use SECURITY DEFINER RPC increment_referral_click, which bypasses RLS.
