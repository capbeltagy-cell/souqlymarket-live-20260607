
-- Grants for Data API access
GRANT SELECT ON public.companies TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;

GRANT SELECT ON public.agents TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.agents TO authenticated;
GRANT ALL ON public.agents TO service_role;

GRANT SELECT ON public.listings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT ALL ON public.listings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commissions TO authenticated;
GRANT ALL ON public.commissions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT SELECT ON public.referrals TO anon; -- needed for /r/$code lookup
GRANT ALL ON public.referrals TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_applications TO authenticated;
GRANT ALL ON public.agent_applications TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_landing_pages TO authenticated;
GRANT SELECT ON public.agent_landing_pages TO anon;
GRANT ALL ON public.agent_landing_pages TO service_role;

-- Allow anyone to look up a referral code anonymously (used by /r/$code redirect)
DROP POLICY IF EXISTS "Referrals lookup by code" ON public.referrals;
CREATE POLICY "Referrals lookup by code"
ON public.referrals
FOR SELECT
USING (true);

-- RPC to increment click count for a referral code (callable by anyone)
CREATE OR REPLACE FUNCTION public.increment_referral_click(_code text)
RETURNS TABLE(listing_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.referrals
  SET clicks = clicks + 1
  WHERE code = _code
  RETURNING referrals.listing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_referral_click(text) TO anon, authenticated;

-- RPC to register a conversion and create a commission row (called by company owner)
CREATE OR REPLACE FUNCTION public.convert_referral(_referral_id uuid, _amount numeric, _currency text DEFAULT 'USD', _notes text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral public.referrals%ROWTYPE;
  v_company_id uuid;
  v_owner uuid;
  v_commission_id uuid;
BEGIN
  SELECT * INTO v_referral FROM public.referrals WHERE id = _referral_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Referral not found'; END IF;

  SELECT company_id INTO v_company_id FROM public.listings WHERE id = v_referral.listing_id;
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF;

  SELECT owner_id INTO v_owner FROM public.companies WHERE id = v_company_id;
  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only the listing company owner can record a conversion';
    END IF;
  END IF;

  UPDATE public.referrals SET conversions = conversions + 1 WHERE id = _referral_id;

  INSERT INTO public.commissions (agent_id, company_id, listing_id, amount, currency, status, notes)
  VALUES (v_referral.agent_id, v_company_id, v_referral.listing_id, _amount, COALESCE(_currency,'USD'), 'pending', _notes)
  RETURNING id INTO v_commission_id;

  RETURN v_commission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_referral(uuid, numeric, text, text) TO authenticated;
