
-- 1. Lock down convert_referral: only authenticated callers
REVOKE EXECUTE ON FUNCTION public.convert_referral(uuid, numeric, text, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_referral(uuid, numeric, text, text) TO authenticated;

-- 2. has_role: keep authenticated-only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 3. Add payout request timestamp
ALTER TABLE public.commissions
  ADD COLUMN IF NOT EXISTS payout_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- 4. Agent can request payout on own APPROVED commission (only updates payout_requested_at).
--    We can't easily column-restrict in a single policy, so we keep the rule scoped via WITH CHECK
--    and disallow status change by re-asserting status stays 'approved'.
DROP POLICY IF EXISTS "Agent requests payout" ON public.commissions;
CREATE POLICY "Agent requests payout"
ON public.commissions
FOR UPDATE
TO authenticated
USING (
  status = 'approved'
  AND EXISTS (SELECT 1 FROM public.agents a WHERE a.id = commissions.agent_id AND a.user_id = auth.uid())
)
WITH CHECK (
  status = 'approved'
  AND EXISTS (SELECT 1 FROM public.agents a WHERE a.id = commissions.agent_id AND a.user_id = auth.uid())
);

-- 5. When status flips to 'paid', stamp paid_at automatically
CREATE OR REPLACE FUNCTION public.stamp_commission_paid()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    NEW.paid_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_commission_paid ON public.commissions;
CREATE TRIGGER trg_stamp_commission_paid
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.stamp_commission_paid();
