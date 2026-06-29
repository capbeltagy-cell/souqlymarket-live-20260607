
-- Restrict anon SELECT on companies to non-sensitive columns only
REVOKE SELECT ON public.companies FROM anon;
GRANT SELECT (
  id, owner_id, name_ar, name_en, description_ar, description_en,
  logo_url, cover_url, industry, country, city, governorate,
  is_verified, subscription_plan, company_type, category_slug,
  export_available, production_capacity, is_premium, created_at, updated_at
) ON public.companies TO anon;

-- company_profiles_extra: authenticated/owner/admin only
DROP POLICY IF EXISTS "profile extra public read" ON public.company_profiles_extra;
CREATE POLICY "profile extra owner read" ON public.company_profiles_extra
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_profiles_extra.company_id AND c.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
REVOKE SELECT ON public.company_profiles_extra FROM anon;

-- listings: hide phone/whatsapp from anon column GRANTs
REVOKE SELECT ON public.listings FROM anon;
GRANT SELECT (
  id, company_id, type, title_ar, title_en, description_ar, description_en,
  category, price, currency, country, city, governorate, location,
  latitude, longitude, images, image_sources, video_url, pdf_url,
  commission_percentage, status, featured, featured_until, created_at, updated_at,
  views_count, clicks_count, leads_count,
  property_subtype, area_sqm, bedrooms, bathrooms, purpose, ownership_type, address_line
) ON public.listings TO anon;

-- rfqs: scope SELECT to buyer/admin or open RFQs only (so suppliers can browse to bid)
DROP POLICY IF EXISTS "rfqs authenticated read" ON public.rfqs;
CREATE POLICY "rfqs owner or open read" ON public.rfqs
  FOR SELECT TO authenticated
  USING (
    buyer_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR status = 'open'
  );
