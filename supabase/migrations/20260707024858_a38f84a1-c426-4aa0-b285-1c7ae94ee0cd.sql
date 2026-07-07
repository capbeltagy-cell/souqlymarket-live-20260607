
-- 1. Company: remember which marketer referred this company
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS referred_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS referred_by_code text;

CREATE INDEX IF NOT EXISTS companies_referred_by_user_id_idx
  ON public.companies(referred_by_user_id)
  WHERE referred_by_user_id IS NOT NULL;

-- 2. Commissions: tag source and guarantee at most one subscription commission per company
ALTER TABLE public.commissions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'listing';

CREATE UNIQUE INDEX IF NOT EXISTS commissions_one_subscription_per_company
  ON public.commissions (company_id)
  WHERE source = 'company_subscription';

-- 3. Platform settings: configurable reward
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS subscription_marketer_commission_pct numeric NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS subscription_plan_price_egp numeric NOT NULL DEFAULT 499;

-- 4. Attach a marketer to my own company (called from the app, once)
CREATE OR REPLACE FUNCTION public.set_company_referrer(_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner_user_id uuid;
  v_company_id uuid;
  v_existing_ref uuid;
BEGIN
  IF v_uid IS NULL OR _code IS NULL OR length(_code) < 4 THEN RETURN false; END IF;

  SELECT owner_user_id INTO v_owner_user_id
    FROM public.company_referrals WHERE code = _code LIMIT 1;
  IF v_owner_user_id IS NULL THEN RETURN false; END IF;
  IF v_owner_user_id = v_uid THEN RETURN false; END IF; -- self-referral

  SELECT id, referred_by_user_id INTO v_company_id, v_existing_ref
    FROM public.companies WHERE owner_id = v_uid LIMIT 1;
  IF v_company_id IS NULL THEN RETURN false; END IF;
  IF v_existing_ref IS NOT NULL THEN RETURN false; END IF; -- already attributed

  UPDATE public.companies
     SET referred_by_user_id = v_owner_user_id,
         referred_by_code = _code
   WHERE id = v_company_id;

  UPDATE public.company_referrals
     SET signups = signups + 1
   WHERE code = _code;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.set_company_referrer(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_company_referrer(text) TO authenticated, service_role;

-- 5. Trigger: when a company's subscription goes to the paid plan, create the
--    marketer's pending commission (idempotent thanks to the unique index).
CREATE OR REPLACE FUNCTION public.on_company_subscription_referral_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id uuid;
  v_pct numeric;
  v_price numeric;
  v_amount numeric;
BEGIN
  IF NEW.subscription_plan = 'premium_company'
     AND (OLD.subscription_plan IS DISTINCT FROM 'premium_company')
     AND NEW.referred_by_user_id IS NOT NULL
     AND NEW.referred_by_user_id <> NEW.owner_id THEN

    SELECT id INTO v_agent_id
      FROM public.agents WHERE user_id = NEW.referred_by_user_id LIMIT 1;
    IF v_agent_id IS NULL THEN
      -- Referrer isn't an active marketer/agent; still count the conversion.
      UPDATE public.company_referrals
         SET conversions = conversions + 1
       WHERE owner_user_id = NEW.referred_by_user_id
         AND (NEW.referred_by_code IS NULL OR code = NEW.referred_by_code);
      RETURN NEW;
    END IF;

    SELECT COALESCE(subscription_marketer_commission_pct, 15),
           COALESCE(subscription_plan_price_egp, 499)
      INTO v_pct, v_price
      FROM public.platform_settings WHERE id = true;

    v_amount := round(COALESCE(v_price,0) * (COALESCE(v_pct,0) / 100.0), 2);
    IF v_amount <= 0 THEN RETURN NEW; END IF;

    BEGIN
      INSERT INTO public.commissions
        (agent_id, company_id, listing_id, amount, currency, status, source, notes)
      VALUES
        (v_agent_id, NEW.id, NULL, v_amount, 'EGP', 'pending', 'company_subscription',
         'Subscription referral: ' || COALESCE(NEW.name_en, NEW.name_ar, NEW.id::text));
      UPDATE public.company_referrals
         SET conversions = conversions + 1
       WHERE owner_user_id = NEW.referred_by_user_id
         AND (NEW.referred_by_code IS NULL OR code = NEW.referred_by_code);
    EXCEPTION WHEN unique_violation THEN
      -- Already recorded for this company; do nothing.
      NULL;
    END;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block a subscription activation on referral bookkeeping.
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_company_subscription_referral ON public.companies;
CREATE TRIGGER trg_company_subscription_referral
AFTER UPDATE OF subscription_plan ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.on_company_subscription_referral_commission();

-- 6. Protect the new columns from being self-edited by the company owner
--    (only the RPC / admin should set them).
CREATE OR REPLACE FUNCTION public.protect_company_privileged_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_verified := OLD.is_verified;
    NEW.is_premium := OLD.is_premium;
    NEW.subscription_plan := OLD.subscription_plan;
    NEW.subscription_expires_at := OLD.subscription_expires_at;
    NEW.subscription_updated_at := OLD.subscription_updated_at;
    NEW.referred_by_user_id := OLD.referred_by_user_id;
    NEW.referred_by_code := OLD.referred_by_code;
  END IF;
  RETURN NEW;
END $$;
