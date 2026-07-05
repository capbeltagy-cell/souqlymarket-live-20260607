-- Pure marketer check: has 'agent' role, no 'company' or 'admin'
CREATE OR REPLACE FUNCTION public.is_pure_marketer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'agent')
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('company','admin'));
$$;

-- Restrictive INSERT policies that block pure marketers regardless of any permissive policy.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['companies','factories','listings','rfqs','tenders','wholesale_listings','quotations'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS block_pure_marketer_insert ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY block_pure_marketer_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_pure_marketer(auth.uid()))',
      t
    );
  END LOOP;
END $$;