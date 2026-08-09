-- Rollback for 20260809043000_live_security_reconciliation.sql
-- Restores only the permissions/options changed by that migration.
BEGIN;

ALTER VIEW public.marketplace_stats RESET (security_invoker);
ALTER FUNCTION public.set_updated_at() RESET search_path;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = 'public';
ALTER FUNCTION public.enforce_listing_owner() SET search_path = 'public';
ALTER FUNCTION public.increment_catalog_downloads(uuid) SET search_path = 'public';
ALTER FUNCTION public.increment_listing_click(uuid) SET search_path = 'public';
ALTER FUNCTION public.increment_listing_view(uuid) SET search_path = 'public';
ALTER FUNCTION public.increment_partner_click(uuid) SET search_path = 'public';
ALTER FUNCTION public.increment_referral_click(text) SET search_path = 'public';
ALTER FUNCTION public.track_company_referral_click(text) SET search_path = 'public';

GRANT EXECUTE ON FUNCTION public.enforce_listing_owner() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.convert_referral(text, uuid, uuid, numeric)
  TO PUBLIC, anon, authenticated;

COMMIT;

