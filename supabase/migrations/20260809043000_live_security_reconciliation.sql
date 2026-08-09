-- Live-schema reconciliation for the existing Souqly production project.
-- Forward-only: no tables, records, buckets, or user accounts are removed.

DO $$
BEGIN
  IF to_regclass('public.marketplace_stats') IS NOT NULL THEN
    ALTER VIEW public.marketplace_stats SET (security_invoker = true);
  END IF;
END
$$;

ALTER FUNCTION public.set_updated_at() SET search_path = '';
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = '';
ALTER FUNCTION public.enforce_listing_owner() SET search_path = '';
ALTER FUNCTION public.increment_catalog_downloads(uuid) SET search_path = '';
ALTER FUNCTION public.increment_listing_click(uuid) SET search_path = '';
ALTER FUNCTION public.increment_listing_view(uuid) SET search_path = '';
ALTER FUNCTION public.increment_partner_click(uuid) SET search_path = '';
ALTER FUNCTION public.increment_referral_click(text) SET search_path = '';
ALTER FUNCTION public.track_company_referral_click(text) SET search_path = '';

-- Trigger functions are invoked by their triggers and must not be exposed as RPCs.
REVOKE EXECUTE ON FUNCTION public.enforce_listing_owner() FROM PUBLIC, anon, authenticated;

-- Anonymous callers must not probe protected user roles. Authenticated calls remain
-- available because existing RLS policies and server functions depend on this helper.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Retire the legacy overload that lets a caller supply an arbitrary converted user.
-- The ownership-checked UUID overload remains available to authenticated callers.
REVOKE EXECUTE ON FUNCTION public.convert_referral(text, uuid, uuid, numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.convert_referral(text, uuid, uuid, numeric)
  TO service_role;
