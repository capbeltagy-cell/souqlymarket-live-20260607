
-- 1) companies: hide email/phone/website from anon via column-level grant
DROP POLICY IF EXISTS "Companies viewable by everyone" ON public.companies;
CREATE POLICY "Companies public read" ON public.companies
  FOR SELECT TO anon, authenticated
  USING (true);

REVOKE SELECT ON public.companies FROM anon;
GRANT SELECT (id, owner_id, name_ar, name_en, description_ar, description_en,
              logo_url, cover_url, industry, country, city, governorate,
              company_type, category_slug, is_verified, is_premium,
              subscription_plan, export_available, production_capacity,
              created_at, updated_at, subscription_expires_at, subscription_updated_at)
  ON public.companies TO anon;

-- 2) company_referrals: owner + admin only
DROP POLICY IF EXISTS "company referrals public read" ON public.company_referrals;
CREATE POLICY "company referrals owner read" ON public.company_referrals
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) profiles: authenticated only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- 4) rfqs: authenticated only
DROP POLICY IF EXISTS "rfqs public read" ON public.rfqs;
CREATE POLICY "rfqs authenticated read" ON public.rfqs
  FOR SELECT TO authenticated
  USING (true);

-- 5) Storage: company-catalogs - restrict reads to owner folder
DROP POLICY IF EXISTS "company-catalogs read auth" ON storage.objects;
CREATE POLICY "company-catalogs owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'company-catalogs'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 6) Storage: rfq-attachments - restrict to RFQ buyer, supplier companies on offers, admins
DROP POLICY IF EXISTS "rfq-attachments read auth" ON storage.objects;
DROP POLICY IF EXISTS "rfq-attachments authenticated read" ON storage.objects;
CREATE POLICY "rfq-attachments stakeholder read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'rfq-attachments'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.rfqs r
        WHERE r.id::text = (storage.foldername(name))[1]
          AND (
            r.buyer_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.rfq_offers o
              JOIN public.companies c ON c.id = o.company_id
              WHERE o.rfq_id = r.id AND c.owner_id = auth.uid()
            )
          )
      )
    )
  );

-- 7) leads: tighten always-true insert policy
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;
CREATE POLICY "Public can submit valid lead" ON public.leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    listing_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id)
    AND (message IS NULL OR length(message) <= 4000)
  );

-- 8) Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.convert_referral(uuid, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_referral(uuid, numeric, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.ensure_wallet(uuid, public.wallet_kind) FROM PUBLIC, anon, authenticated;

-- Tracking RPCs remain callable from anon (used on public listing/referral pages)
REVOKE EXECUTE ON FUNCTION public.increment_listing_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_listing_view(uuid) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_listing_click(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_listing_click(uuid) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_referral_click(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_referral_click(text) TO anon, authenticated;

-- Trigger-only functions: no app callers, lock them down
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.stamp_commission_paid() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.commission_to_wallet() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.payment_to_invoice() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_listing_leads_count() FROM PUBLIC, anon, authenticated;
