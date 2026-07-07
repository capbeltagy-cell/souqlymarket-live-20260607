
-- 1) Commissions: remove owner-writable INSERT/UPDATE policies.
--    Commission rows must be produced by SECURITY DEFINER functions
--    (attribute_referral_from_code, convert_referral, on_order_paid_attribute_referral,
--     on_company_subscription_referral_commission) or by admins.
DROP POLICY IF EXISTS "Company inserts commissions" ON public.commissions;
DROP POLICY IF EXISTS "Company updates own commissions" ON public.commissions;

-- 2) Payout requests: prevent non-admin users from mutating monetary/destination fields.
CREATE OR REPLACE FUNCTION public.protect_payout_request_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- Non-admin owners may only transition status (e.g. to cancelled) and add notes.
  NEW.amount           := OLD.amount;
  NEW.currency         := OLD.currency;
  NEW.wallet_id        := OLD.wallet_id;
  NEW.payout_method_id := OLD.payout_method_id;
  NEW.user_id          := OLD.user_id;
  NEW.admin_notes      := OLD.admin_notes;
  NEW.processed_at     := OLD.processed_at;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_payout_request_fields ON public.payout_requests;
CREATE TRIGGER trg_protect_payout_request_fields
BEFORE UPDATE ON public.payout_requests
FOR EACH ROW EXECUTE FUNCTION public.protect_payout_request_fields();
