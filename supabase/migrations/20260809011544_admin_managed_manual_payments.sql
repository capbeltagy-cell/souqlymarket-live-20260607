-- Admin-managed manual payment destinations and final RPC hardening.
-- Additive/convergent; apply to Test before Production.
BEGIN;

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_methods FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON public.payment_methods FROM authenticated;
GRANT SELECT ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;

DROP POLICY IF EXISTS "pm_read_active" ON public.payment_methods;
CREATE POLICY "pm_read_active"
  ON public.payment_methods FOR SELECT TO authenticated
  USING (is_active OR public.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS "pm_admin_write" ON public.payment_methods;

-- SECURITY DEFINER functions must not inherit a caller-controlled search path.
ALTER FUNCTION public.submit_manual_subscription_payment(
  uuid, text, text, text, timestamptz, text, text
) SET search_path = '';
ALTER FUNCTION public.review_manual_subscription_payment(
  uuid, text, text
) SET search_path = '';

COMMIT;
