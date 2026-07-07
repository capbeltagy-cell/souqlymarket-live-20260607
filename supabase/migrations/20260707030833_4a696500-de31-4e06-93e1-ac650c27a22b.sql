-- Marketer promotion metadata on listings + commission-aware order trigger.
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS marketer_promotion_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS commission_type text NOT NULL DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS commission_fixed_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_goal text,
  ADD COLUMN IF NOT EXISTS promotion_conditions text,
  ADD COLUMN IF NOT EXISTS promotion_status text NOT NULL DEFAULT 'active';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listings_commission_type_check') THEN
    ALTER TABLE public.listings ADD CONSTRAINT listings_commission_type_check
      CHECK (commission_type IN ('percentage','fixed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listings_promotion_status_check') THEN
    ALTER TABLE public.listings ADD CONSTRAINT listings_promotion_status_check
      CHECK (promotion_status IN ('active','paused','ended'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS listings_marketer_promotion_idx
  ON public.listings (marketer_promotion_enabled, promotion_status)
  WHERE marketer_promotion_enabled = true;

-- Update the order-paid attribution trigger to honor commission_type.
CREATE OR REPLACE FUNCTION public.on_order_paid_attribute_referral()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_listing_id uuid;
  v_pct numeric;
  v_fixed numeric;
  v_type text;
  v_promo_on boolean;
  v_promo_status text;
  v_amount numeric;
  v_commission numeric;
BEGIN
  IF NEW.payment_status = 'paid'
     AND (OLD.payment_status IS DISTINCT FROM 'paid')
     AND NEW.referral_code IS NOT NULL THEN

    v_listing_id := COALESCE(NEW.product_listing_id, NEW.listing_id);
    IF v_listing_id IS NULL THEN RETURN NEW; END IF;

    IF NOT EXISTS (SELECT 1 FROM public.referrals WHERE code = NEW.referral_code AND listing_id = v_listing_id) THEN
      RETURN NEW;
    END IF;

    SELECT commission_percentage, commission_fixed_amount, commission_type,
           marketer_promotion_enabled, promotion_status
      INTO v_pct, v_fixed, v_type, v_promo_on, v_promo_status
      FROM public.listings WHERE id = v_listing_id;

    -- Only pay commissions on listings that opted into marketer promotion and are active.
    IF NOT COALESCE(v_promo_on, false) OR COALESCE(v_promo_status,'active') <> 'active' THEN
      PERFORM public.attribute_referral_from_code(NEW.referral_code, v_listing_id, 0, COALESCE(NEW.currency,'EGP'), 'Order attribution (no active promotion)');
      RETURN NEW;
    END IF;

    v_amount := COALESCE(NEW.total_amount, 0);
    IF v_type = 'fixed' THEN
      v_commission := COALESCE(v_fixed, 0);
    ELSE
      v_commission := round(v_amount * (COALESCE(v_pct,0) / 100.0), 2);
    END IF;

    IF v_commission > 0 THEN
      PERFORM public.attribute_referral_from_code(
        NEW.referral_code, v_listing_id, v_commission,
        COALESCE(NEW.currency,'EGP'),
        'Auto: order ' || NEW.id::text
      );
    ELSE
      PERFORM public.attribute_referral_from_code(NEW.referral_code, v_listing_id, 0, COALESCE(NEW.currency,'EGP'), 'Order attribution');
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $function$;

-- Public view that masks direct contact info on promoted listings.
-- Anon/authenticated may read only via this view when the marketer promotion is on.
CREATE OR REPLACE VIEW public.listings_public_contacts AS
SELECT
  id,
  CASE WHEN marketer_promotion_enabled AND promotion_status = 'active' THEN NULL ELSE phone END AS phone,
  CASE WHEN marketer_promotion_enabled AND promotion_status = 'active' THEN NULL ELSE whatsapp END AS whatsapp,
  marketer_promotion_enabled,
  promotion_status
FROM public.listings;

GRANT SELECT ON public.listings_public_contacts TO anon, authenticated;