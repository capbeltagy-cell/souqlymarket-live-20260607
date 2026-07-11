
-- 1) Enum extensions
ALTER TYPE public.wallet_kind ADD VALUE IF NOT EXISTS 'company_funding';
ALTER TYPE public.wallet_tx_reason ADD VALUE IF NOT EXISTS 'deposit';
ALTER TYPE public.wallet_tx_reason ADD VALUE IF NOT EXISTS 'campaign_reserve';

-- 2) Wallets: reserved_balance column
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS reserved_balance numeric(14,2) NOT NULL DEFAULT 0;

-- 3) Platform settings: reserve %
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS campaign_reserve_pct numeric(5,2) NOT NULL DEFAULT 25
    CHECK (campaign_reserve_pct >= 0 AND campaign_reserve_pct <= 100);

-- 4) Listings: campaign exposure fields
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS campaign_max_conversions integer,
  ADD COLUMN IF NOT EXISTS campaign_budget_egp numeric(14,2),
  ADD COLUMN IF NOT EXISTS campaign_reserved_amount numeric(14,2) NOT NULL DEFAULT 0;

-- 5) Company deposits
CREATE TABLE IF NOT EXISTS public.company_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'EGP',
  method_code text,
  reference text,
  proof_url text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','under_review','approved','rejected','cancelled')),
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  credited_wallet_tx_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS company_deposits_company_idx ON public.company_deposits(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS company_deposits_status_idx ON public.company_deposits(status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.company_deposits TO authenticated;
GRANT ALL ON public.company_deposits TO service_role;

ALTER TABLE public.company_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own deposits" ON public.company_deposits
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner creates own deposits" ON public.company_deposits
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  );

CREATE POLICY "Owner cancels own pending deposits" ON public.company_deposits
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND status IN ('pending','under_review'))
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Admins manage deposits" ON public.company_deposits
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Prevent non-admin from mutating monetary/approval fields
CREATE OR REPLACE FUNCTION public.protect_company_deposit_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.amount               := OLD.amount;
  NEW.currency             := OLD.currency;
  NEW.method_code          := OLD.method_code;
  NEW.company_id           := OLD.company_id;
  NEW.owner_id             := OLD.owner_id;
  NEW.admin_notes          := OLD.admin_notes;
  NEW.reviewed_by          := OLD.reviewed_by;
  NEW.reviewed_at          := OLD.reviewed_at;
  NEW.credited_wallet_tx_id:= OLD.credited_wallet_tx_id;
  IF NEW.status NOT IN ('cancelled', OLD.status) THEN
    RAISE EXCEPTION 'Only admins can change deposit status (except to cancelled)';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_company_deposit ON public.company_deposits;
CREATE TRIGGER trg_protect_company_deposit
  BEFORE UPDATE ON public.company_deposits
  FOR EACH ROW EXECUTE FUNCTION public.protect_company_deposit_fields();

DROP TRIGGER IF EXISTS trg_company_deposits_updated ON public.company_deposits;
CREATE TRIGGER trg_company_deposits_updated
  BEFORE UPDATE ON public.company_deposits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 6) Ensure funding wallet for the caller (their company)
CREATE OR REPLACE FUNCTION public.ensure_company_funding_wallet()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_wid uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE owner_id = v_uid) THEN
    RAISE EXCEPTION 'No company found for user';
  END IF;
  v_wid := public.ensure_wallet(v_uid, 'company_funding'::wallet_kind);
  RETURN v_wid;
END $$;

-- 7) Approve deposit — admin only, credits funding wallet exactly once
CREATE OR REPLACE FUNCTION public.approve_company_deposit(_deposit_id uuid, _admin_notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_dep public.company_deposits%ROWTYPE;
  v_wid uuid; v_tx uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO v_dep FROM public.company_deposits WHERE id = _deposit_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deposit not found'; END IF;
  IF v_dep.status = 'approved' THEN RAISE EXCEPTION 'Deposit already approved'; END IF;
  IF v_dep.status IN ('rejected','cancelled') THEN RAISE EXCEPTION 'Deposit not in a reviewable state'; END IF;

  v_wid := public.ensure_wallet(v_dep.owner_id, 'company_funding'::wallet_kind);

  INSERT INTO public.wallet_transactions (wallet_id, amount, currency, reason, reference_id, reference_type, notes)
    VALUES (v_wid, v_dep.amount, v_dep.currency, 'deposit', v_dep.id, 'company_deposit',
            COALESCE(_admin_notes, 'Deposit approved'))
    RETURNING id INTO v_tx;

  UPDATE public.wallets SET balance = balance + v_dep.amount, total_earned = total_earned + v_dep.amount
    WHERE id = v_wid;

  UPDATE public.company_deposits
    SET status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        admin_notes = COALESCE(_admin_notes, admin_notes),
        credited_wallet_tx_id = v_tx
    WHERE id = v_dep.id;

  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (v_dep.owner_id, 'payment', 'تم اعتماد الإيداع',
            'تمت إضافة ' || v_dep.amount || ' ' || v_dep.currency || ' لرصيد محفظة الشركة',
            '/company-wallet');
  RETURN v_tx;
END $$;

CREATE OR REPLACE FUNCTION public.reject_company_deposit(_deposit_id uuid, _admin_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dep public.company_deposits%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO v_dep FROM public.company_deposits WHERE id = _deposit_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deposit not found'; END IF;
  IF v_dep.status = 'approved' THEN RAISE EXCEPTION 'Cannot reject an approved deposit'; END IF;
  UPDATE public.company_deposits
    SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
        admin_notes = COALESCE(_admin_notes, admin_notes)
    WHERE id = v_dep.id;
  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (v_dep.owner_id, 'payment', 'تم رفض الإيداع',
            COALESCE('السبب: ' || _admin_notes, 'يرجى التواصل مع الدعم'),
            '/company-wallet');
END $$;

-- 8) Compute required reserve for a listing (server-truth)
CREATE OR REPLACE FUNCTION public.compute_listing_required_reserve(_listing_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_listing public.listings%ROWTYPE;
  v_pct numeric; v_exposure numeric;
BEGIN
  SELECT * INTO v_listing FROM public.listings WHERE id = _listing_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT campaign_reserve_pct INTO v_pct FROM public.platform_settings WHERE id = true;
  v_pct := COALESCE(v_pct, 25);

  IF v_listing.commission_type = 'fixed' AND v_listing.campaign_max_conversions IS NOT NULL THEN
    v_exposure := COALESCE(v_listing.commission_fixed_amount, 0) * v_listing.campaign_max_conversions;
  ELSIF v_listing.campaign_budget_egp IS NOT NULL THEN
    v_exposure := v_listing.campaign_budget_egp;
  ELSIF v_listing.commission_type = 'fixed' THEN
    RETURN NULL; -- fixed without cap → invalid
  ELSE
    RETURN NULL; -- percentage without budget → invalid
  END IF;

  RETURN round(v_exposure * v_pct / 100.0, 2);
END $$;

-- 9) Activate promotion atomically (moves balance → reserved)
CREATE OR REPLACE FUNCTION public.activate_listing_promotion(_listing_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_listing public.listings%ROWTYPE;
  v_owner uuid; v_required numeric; v_currently_held numeric; v_delta numeric;
  v_wid uuid; v_bal numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_listing FROM public.listings WHERE id = _listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found'; END IF;
  SELECT owner_id INTO v_owner FROM public.companies WHERE id = v_listing.company_id;
  IF v_owner IS NULL OR (v_owner <> v_uid AND NOT public.has_role(v_uid, 'admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF NOT COALESCE(v_listing.marketer_promotion_enabled, false) THEN
    RAISE EXCEPTION 'Marketer promotion is not enabled on this listing';
  END IF;

  v_required := public.compute_listing_required_reserve(_listing_id);
  IF v_required IS NULL THEN
    RAISE EXCEPTION 'Configure a campaign budget or (for fixed commissions) a maximum conversion count before activating';
  END IF;

  v_currently_held := COALESCE(v_listing.campaign_reserved_amount, 0);
  v_delta := v_required - v_currently_held;

  v_wid := public.ensure_wallet(v_owner, 'company_funding'::wallet_kind);

  IF v_delta > 0 THEN
    SELECT balance INTO v_bal FROM public.wallets WHERE id = v_wid FOR UPDATE;
    IF v_bal < v_delta THEN
      RAISE EXCEPTION 'Insufficient company wallet balance. Required: %, available: %', v_delta, v_bal;
    END IF;
    UPDATE public.wallets
      SET balance = balance - v_delta,
          reserved_balance = reserved_balance + v_delta
      WHERE id = v_wid;
    INSERT INTO public.wallet_transactions(wallet_id, amount, currency, reason, reference_id, reference_type, notes)
      VALUES (v_wid, -v_delta, 'EGP', 'campaign_reserve', _listing_id, 'listing', 'Campaign reserve hold');
  ELSIF v_delta < 0 THEN
    -- Reserve shrinking (e.g. lower budget on re-activate): release the excess
    UPDATE public.wallets
      SET balance = balance + (-v_delta),
          reserved_balance = GREATEST(reserved_balance - (-v_delta), 0)
      WHERE id = v_wid;
    INSERT INTO public.wallet_transactions(wallet_id, amount, currency, reason, reference_id, reference_type, notes)
      VALUES (v_wid, -v_delta, 'EGP', 'campaign_reserve', _listing_id, 'listing', 'Campaign reserve released (adjust)');
  END IF;

  UPDATE public.listings
    SET promotion_status = 'active',
        campaign_reserved_amount = v_required
    WHERE id = _listing_id;

  RETURN jsonb_build_object('ok', true, 'required_reserve', v_required, 'reserved_delta', v_delta);
END $$;

-- 10) Deactivate (pause/end): release reserve minus outstanding pending commissions
CREATE OR REPLACE FUNCTION public.deactivate_listing_promotion(_listing_id uuid, _status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_listing public.listings%ROWTYPE;
  v_owner uuid; v_held numeric; v_pending numeric; v_release numeric;
  v_wid uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _status NOT IN ('paused','ended') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT * INTO v_listing FROM public.listings WHERE id = _listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found'; END IF;
  SELECT owner_id INTO v_owner FROM public.companies WHERE id = v_listing.company_id;
  IF v_owner IS NULL OR (v_owner <> v_uid AND NOT public.has_role(v_uid, 'admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_held := COALESCE(v_listing.campaign_reserved_amount, 0);
  SELECT COALESCE(SUM(amount),0) INTO v_pending
    FROM public.commissions
    WHERE listing_id = _listing_id AND status IN ('pending','approved');

  IF _status = 'paused' THEN
    -- Keep reserve intact; just stop new participation
    UPDATE public.listings SET promotion_status = 'paused' WHERE id = _listing_id;
    RETURN jsonb_build_object('ok', true, 'released', 0);
  END IF;

  -- ended: release the excess above pending obligations
  v_release := GREATEST(v_held - v_pending, 0);
  IF v_release > 0 THEN
    v_wid := public.ensure_wallet(v_owner, 'company_funding'::wallet_kind);
    UPDATE public.wallets
      SET balance = balance + v_release,
          reserved_balance = GREATEST(reserved_balance - v_release, 0)
      WHERE id = v_wid;
    INSERT INTO public.wallet_transactions(wallet_id, amount, currency, reason, reference_id, reference_type, notes)
      VALUES (v_wid, v_release, 'EGP', 'campaign_reserve', _listing_id, 'listing', 'Campaign reserve released on end');
  END IF;
  UPDATE public.listings
    SET promotion_status = 'ended',
        campaign_reserved_amount = GREATEST(v_held - v_release, 0)
    WHERE id = _listing_id;
  RETURN jsonb_build_object('ok', true, 'released', v_release);
END $$;

-- 11) Replace commission_to_wallet: when a promoted listing commission is paid,
-- debit the company funding wallet's reserve instead of the earnings wallet.
CREATE OR REPLACE FUNCTION public.commission_to_wallet()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_agent_user uuid;
  v_company_owner uuid;
  v_agent_wallet uuid;
  v_platform_wallet uuid;
  v_company_funding_wallet uuid;
  v_platform_pct numeric;
  v_platform_cut numeric(14,2);
  v_agent_cut numeric(14,2);
  v_is_promoted boolean;
  v_reserve_held numeric;
  v_from_reserve numeric;
  v_from_balance numeric;
BEGIN
  SELECT platform_commission_pct INTO v_platform_pct FROM public.platform_settings WHERE id = true;
  v_platform_pct := COALESCE(v_platform_pct, 10);

  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    SELECT user_id INTO v_agent_user FROM public.agents WHERE id = NEW.agent_id;
    SELECT owner_id INTO v_company_owner FROM public.companies WHERE id = NEW.company_id;

    v_platform_cut := round(NEW.amount * (v_platform_pct / 100.0), 2);
    v_agent_cut := NEW.amount - v_platform_cut;

    -- Credit agent
    IF v_agent_user IS NOT NULL THEN
      v_agent_wallet := public.ensure_wallet(v_agent_user, 'agent');
      INSERT INTO public.wallet_transactions(wallet_id, amount, currency, reason, reference_id, reference_type, notes)
        VALUES (v_agent_wallet, v_agent_cut, NEW.currency, 'commission', NEW.id, 'commission', 'Commission earned');
      UPDATE public.wallets SET balance = balance + v_agent_cut, total_earned = total_earned + v_agent_cut
        WHERE id = v_agent_wallet;
    END IF;

    -- Debit company: prefer funding wallet's reserve when listing is promoted
    v_is_promoted := false;
    IF NEW.listing_id IS NOT NULL THEN
      SELECT COALESCE(marketer_promotion_enabled,false), COALESCE(campaign_reserved_amount,0)
        INTO v_is_promoted, v_reserve_held
        FROM public.listings WHERE id = NEW.listing_id;
    END IF;

    IF v_company_owner IS NOT NULL AND v_is_promoted THEN
      v_company_funding_wallet := public.ensure_wallet(v_company_owner, 'company_funding');
      -- Take up to the held reserve; overflow (shouldn't happen if cap enforced) from balance
      v_from_reserve := LEAST(NEW.amount, COALESCE(v_reserve_held, 0));
      v_from_balance := NEW.amount - v_from_reserve;
      UPDATE public.wallets
        SET reserved_balance = GREATEST(reserved_balance - v_from_reserve, 0),
            balance = GREATEST(balance - v_from_balance, 0),
            total_paid_out = total_paid_out + NEW.amount
        WHERE id = v_company_funding_wallet;
      INSERT INTO public.wallet_transactions(wallet_id, amount, currency, reason, reference_id, reference_type, notes)
        VALUES (v_company_funding_wallet, -NEW.amount, NEW.currency, 'commission', NEW.id, 'commission', 'Commission settled from reserve');
      IF NEW.listing_id IS NOT NULL THEN
        UPDATE public.listings
          SET campaign_reserved_amount = GREATEST(COALESCE(campaign_reserved_amount,0) - v_from_reserve, 0)
          WHERE id = NEW.listing_id;
      END IF;
    ELSIF v_company_owner IS NOT NULL THEN
      -- Legacy path (non-promoted / subscription referral): use earnings wallet like before
      v_company_funding_wallet := public.ensure_wallet(v_company_owner, 'company');
      INSERT INTO public.wallet_transactions(wallet_id, amount, currency, reason, reference_id, reference_type, notes)
        VALUES (v_company_funding_wallet, -NEW.amount, NEW.currency, 'commission', NEW.id, 'commission', 'Commission paid out');
      UPDATE public.wallets SET total_paid_out = total_paid_out + NEW.amount WHERE id = v_company_funding_wallet;
    END IF;

    -- Platform cut
    v_platform_wallet := public.ensure_wallet(NULL, 'platform');
    INSERT INTO public.wallet_transactions(wallet_id, amount, currency, reason, reference_id, reference_type, notes)
      VALUES (v_platform_wallet, v_platform_cut, NEW.currency, 'commission', NEW.id, 'commission', 'Platform cut');
    UPDATE public.wallets SET balance = balance + v_platform_cut, total_earned = total_earned + v_platform_cut
      WHERE id = v_platform_wallet;
  END IF;

  IF NEW.status = 'pending' AND TG_OP = 'INSERT' AND v_agent_user IS NULL THEN
    SELECT user_id INTO v_agent_user FROM public.agents WHERE id = NEW.agent_id;
    IF v_agent_user IS NOT NULL THEN
      v_agent_wallet := public.ensure_wallet(v_agent_user, 'agent');
      UPDATE public.wallets SET pending_balance = pending_balance + (NEW.amount * ((100 - v_platform_pct) / 100.0))
        WHERE id = v_agent_wallet;
    END IF;
  END IF;

  RETURN NEW;
END $$;
