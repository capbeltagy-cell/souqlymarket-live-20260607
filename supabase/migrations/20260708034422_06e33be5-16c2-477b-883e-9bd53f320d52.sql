
-- 1) audit_logs: remove user INSERT ability; keep trigger inserts (SECURITY DEFINER bypasses RLS)
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
REVOKE INSERT ON public.audit_logs FROM authenticated;
REVOKE INSERT ON public.audit_logs FROM anon;

-- 2) platform_settings: restrict SELECT to admins only
DROP POLICY IF EXISTS "anyone auth reads settings" ON public.platform_settings;
CREATE POLICY "admins read settings" ON public.platform_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Public pricing function — exposes ONLY the two non-sensitive fields
CREATE OR REPLACE FUNCTION public.get_public_pricing()
RETURNS TABLE(subscription_plan_price_egp numeric, subscription_marketer_commission_pct numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT subscription_plan_price_egp, subscription_marketer_commission_pct
  FROM public.platform_settings
  WHERE id = true
$$;

GRANT EXECUTE ON FUNCTION public.get_public_pricing() TO anon, authenticated;
