
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS referral_code text;
ALTER TABLE public.wholesale_orders ADD COLUMN IF NOT EXISTS referral_code text;

CREATE INDEX IF NOT EXISTS leads_referral_code_idx ON public.leads(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS wholesale_orders_referral_code_idx ON public.wholesale_orders(referral_code) WHERE referral_code IS NOT NULL;

-- Helper: attribute a referral by code. Bypasses the auth.uid() owner check
-- in convert_referral because the buyer, not the seller, triggers the event.
CREATE OR REPLACE FUNCTION public.attribute_referral_from_code(
  _code text,
  _listing_id uuid,
  _amount numeric DEFAULT 0,
  _currency text DEFAULT 'EGP',
  _notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral public.referrals%ROWTYPE;
  v_company_id uuid;
  v_commission_id uuid;
BEGIN
  IF _code IS NULL OR _listing_id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_referral FROM public.referrals
    WHERE code = _code AND listing_id = _listing_id
    LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  UPDATE public.referrals SET conversions = conversions + 1 WHERE id = v_referral.id;

  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN NULL;
  END IF;

  SELECT company_id INTO v_company_id FROM public.listings WHERE id = _listing_id;
  IF v_company_id IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.commissions (agent_id, company_id, listing_id, amount, currency, status, notes)
  VALUES (v_referral.agent_id, v_company_id, _listing_id, _amount, COALESCE(_currency,'EGP'), 'pending', _notes)
  RETURNING id INTO v_commission_id;

  RETURN v_commission_id;
END;
$$;

REVOKE ALL ON FUNCTION public.attribute_referral_from_code(text,uuid,numeric,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attribute_referral_from_code(text,uuid,numeric,text,text) TO authenticated, anon, service_role;

-- Lead attribution: bump conversion counter only (a lead is not a sale).
CREATE OR REPLACE FUNCTION public.on_lead_attribute_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NOT NULL AND NEW.listing_id IS NOT NULL THEN
    PERFORM public.attribute_referral_from_code(NEW.referral_code, NEW.listing_id, 0, 'EGP', 'Lead attribution');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_lead_attribute_referral ON public.leads;
CREATE TRIGGER trg_lead_attribute_referral
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.on_lead_attribute_referral();

-- Order attribution: when the order is paid, create a pending commission
-- sized by the listing's commission_percentage (or wholesale listing's).
CREATE OR REPLACE FUNCTION public.on_order_paid_attribute_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_id uuid;
  v_pct numeric;
  v_amount numeric;
  v_commission numeric;
BEGIN
  IF NEW.payment_status = 'paid'
     AND (OLD.payment_status IS DISTINCT FROM 'paid')
     AND NEW.referral_code IS NOT NULL THEN

    v_listing_id := COALESCE(NEW.product_listing_id, NEW.listing_id);
    IF v_listing_id IS NULL THEN RETURN NEW; END IF;

    -- Only attribute against a listing that has a matching referral code.
    IF NOT EXISTS (SELECT 1 FROM public.referrals WHERE code = NEW.referral_code AND listing_id = v_listing_id) THEN
      RETURN NEW;
    END IF;

    SELECT commission_percentage INTO v_pct FROM public.listings WHERE id = v_listing_id;
    v_pct := COALESCE(v_pct, 0);
    v_amount := COALESCE(NEW.total_amount, 0);
    v_commission := round(v_amount * (v_pct / 100.0), 2);

    IF v_commission > 0 THEN
      PERFORM public.attribute_referral_from_code(
        NEW.referral_code, v_listing_id, v_commission,
        COALESCE(NEW.currency,'EGP'),
        'Auto: order ' || NEW.id::text
      );
    ELSE
      -- Still count the conversion even if there's no commission percentage.
      PERFORM public.attribute_referral_from_code(NEW.referral_code, v_listing_id, 0, COALESCE(NEW.currency,'EGP'), 'Order attribution');
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_order_paid_attribute_referral ON public.wholesale_orders;
CREATE TRIGGER trg_order_paid_attribute_referral
AFTER UPDATE OF payment_status ON public.wholesale_orders
FOR EACH ROW EXECUTE FUNCTION public.on_order_paid_attribute_referral();
