-- Souqly payment security boundary.
-- Prepared for an isolated test project first. DO NOT apply to production
-- until the test migration, RLS matrix, and Paymob sandbox reports pass.

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_reference uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  idempotency_key uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  company_id uuid REFERENCES public.companies(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES public.wholesale_orders(id) ON DELETE RESTRICT,
  purpose text NOT NULL CHECK (purpose IN ('company_subscription', 'marketplace_order')),
  plan public.subscription_plan,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  provider text NOT NULL DEFAULT 'paymob' CHECK (provider = 'paymob'),
  provider_intention_id text,
  provider_transaction_id text UNIQUE,
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'pending', 'paid', 'failed', 'cancelled', 'expired', 'refunded')),
  failure_code text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_target_chk CHECK (
    (purpose = 'company_subscription' AND company_id IS NOT NULL AND order_id IS NULL AND plan = 'premium_company')
    OR
    (purpose = 'marketplace_order' AND order_id IS NOT NULL AND plan IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS payment_transactions_user_created_idx
  ON public.payment_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_transactions_status_idx
  ON public.payment_transactions(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.payment_transactions(id) ON DELETE RESTRICT,
  provider text NOT NULL DEFAULT 'paymob' CHECK (provider = 'paymob'),
  provider_event_key text NOT NULL UNIQUE,
  payload_hash text NOT NULL,
  signature_valid boolean NOT NULL,
  processing_status text NOT NULL
    CHECK (processing_status IN ('accepted', 'rejected', 'duplicate', 'ignored')),
  reason_code text,
  sanitized_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS payment_events_transaction_idx
  ON public.payment_events(transaction_id, received_at DESC);

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE RESTRICT,
  payment_transaction_id uuid REFERENCES public.payment_transactions(id) ON DELETE RESTRICT,
  event_type text NOT NULL
    CHECK (event_type IN ('activated', 'renewed', 'expired', 'cancelled', 'payment_failed')),
  from_expires_at timestamptz,
  to_expires_at timestamptz,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.payment_transactions FROM anon, authenticated;
REVOKE ALL ON public.payment_events FROM anon, authenticated;
REVOKE ALL ON public.subscription_events FROM anon, authenticated;
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT SELECT ON public.subscription_events TO authenticated;
GRANT ALL ON public.payment_transactions, public.payment_events, public.subscription_events TO service_role;

DROP POLICY IF EXISTS "Users view own payment transactions" ON public.payment_transactions;
CREATE POLICY "Users view own payment transactions"
  ON public.payment_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users view own subscription events" ON public.subscription_events;
CREATE POLICY "Users view own subscription events"
  ON public.subscription_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.id = subscription_events.subscription_id AND s.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Admins view payment events" ON public.payment_events;
CREATE POLICY "Admins view payment events"
  ON public.payment_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- A user must never create or activate a subscription directly.
DROP POLICY IF EXISTS "Users create own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users update own subscription" ON public.subscriptions;
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;

-- Server-side price and ownership resolution. The browser supplies neither
-- amount nor currency. Only service_role can call this function.
CREATE OR REPLACE FUNCTION public.create_paymob_payment_attempt(
  _user_id uuid,
  _purpose text,
  _company_id uuid,
  _order_id uuid,
  _plan text,
  _idempotency_key uuid
)
RETURNS TABLE (
  client_reference uuid,
  amount_cents bigint,
  currency text,
  status text,
  purpose text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount_cents bigint;
  v_currency text := 'EGP';
BEGIN
  IF _purpose = 'company_subscription' THEN
    IF _company_id IS NULL OR _plan IS DISTINCT FROM 'premium_company' THEN
      RAISE EXCEPTION 'INVALID_SUBSCRIPTION_TARGET';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = _company_id AND c.owner_id = _user_id
    ) THEN
      RAISE EXCEPTION 'FORBIDDEN_COMPANY';
    END IF;
    SELECT (COALESCE(ps.subscription_plan_price_egp, 499) * 100)::bigint
      INTO v_amount_cents
      FROM public.platform_settings ps
      LIMIT 1;
    v_amount_cents := COALESCE(v_amount_cents, 49900);
  ELSIF _purpose = 'marketplace_order' THEN
    IF _order_id IS NULL THEN
      RAISE EXCEPTION 'INVALID_ORDER_TARGET';
    END IF;
    SELECT round(wo.total_amount * 100)::bigint, upper(wo.currency)
      INTO v_amount_cents, v_currency
      FROM public.wholesale_orders wo
      WHERE wo.id = _order_id
        AND wo.buyer_id = _user_id
        AND wo.payment_status IS DISTINCT FROM 'paid';
    IF v_amount_cents IS NULL THEN
      RAISE EXCEPTION 'ORDER_NOT_PAYABLE';
    END IF;
  ELSE
    RAISE EXCEPTION 'INVALID_PAYMENT_PURPOSE';
  END IF;

  INSERT INTO public.payment_transactions (
    idempotency_key, user_id, company_id, order_id, purpose, plan,
    amount_cents, currency
  )
  VALUES (
    _idempotency_key, _user_id, _company_id, _order_id, _purpose,
    CASE WHEN _plan IS NULL THEN NULL ELSE _plan::public.subscription_plan END,
    v_amount_cents, v_currency
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN QUERY
  SELECT pt.client_reference, pt.amount_cents, pt.currency, pt.status, pt.purpose
  FROM public.payment_transactions pt
  WHERE pt.idempotency_key = _idempotency_key AND pt.user_id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_paymob_payment_attempt(uuid, text, uuid, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_paymob_payment_attempt(uuid, text, uuid, uuid, text, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.attach_paymob_intention(
  _client_reference uuid,
  _provider_intention_id text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.payment_transactions
  SET provider_intention_id = _provider_intention_id,
      status = CASE WHEN status = 'created' THEN 'pending' ELSE status END,
      updated_at = now()
  WHERE client_reference = _client_reference
    AND status IN ('created', 'pending');
$$;

REVOKE ALL ON FUNCTION public.attach_paymob_intention(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_paymob_intention(uuid, text) TO service_role;

-- Authenticated users can query only their own payment result. The provider
-- callback remains the only path that can mark it paid.
CREATE OR REPLACE FUNCTION public.get_my_payment_attempt(_client_reference uuid)
RETURNS TABLE (
  client_reference uuid,
  purpose text,
  amount_cents bigint,
  currency text,
  status text,
  failure_code text,
  created_at timestamptz,
  verified_at timestamptz
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT pt.client_reference, pt.purpose, pt.amount_cents, pt.currency,
         pt.status, pt.failure_code, pt.created_at, pt.verified_at
  FROM public.payment_transactions pt
  WHERE pt.client_reference = _client_reference
    AND (pt.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
$$;

REVOKE ALL ON FUNCTION public.get_my_payment_attempt(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_payment_attempt(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_rejected_paymob_event(
  _provider_event_key text,
  _payload_hash text,
  _reason_code text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.payment_events(
    provider_event_key, payload_hash, signature_valid, processing_status,
    reason_code, sanitized_payload, processed_at
  )
  VALUES (
    _provider_event_key, _payload_hash, false, 'rejected',
    left(_reason_code, 100), '{}'::jsonb, now()
  )
  ON CONFLICT (provider_event_key) DO NOTHING;
$$;

REVOKE ALL ON FUNCTION public.record_rejected_paymob_event(text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_rejected_paymob_event(text, text, text)
  TO service_role;

-- Atomic, idempotent webhook settlement. It validates the server-resolved
-- amount/currency and activates a subscription only after a verified success.
CREATE OR REPLACE FUNCTION public.process_verified_paymob_event(
  _client_reference uuid,
  _provider_transaction_id text,
  _provider_event_key text,
  _payload_hash text,
  _amount_cents bigint,
  _currency text,
  _success boolean,
  _sanitized_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx public.payment_transactions%ROWTYPE;
  v_subscription public.subscriptions%ROWTYPE;
  v_old_expiry timestamptz;
  v_new_expiry timestamptz;
BEGIN
  SELECT * INTO v_tx
  FROM public.payment_transactions
  WHERE client_reference = _client_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.payment_events (
      provider_event_key, payload_hash, signature_valid, processing_status,
      reason_code, sanitized_payload, processed_at
    ) VALUES (
      _provider_event_key, _payload_hash, true, 'rejected',
      'UNKNOWN_REFERENCE', _sanitized_payload, now()
    ) ON CONFLICT (provider_event_key) DO NOTHING;
    RETURN jsonb_build_object('result', 'rejected', 'reason', 'UNKNOWN_REFERENCE');
  END IF;

  INSERT INTO public.payment_events (
    transaction_id, provider_event_key, payload_hash, signature_valid,
    processing_status, sanitized_payload, processed_at
  ) VALUES (
    v_tx.id, _provider_event_key, _payload_hash, true,
    'accepted', _sanitized_payload, now()
  ) ON CONFLICT (provider_event_key) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'duplicate');
  END IF;

  IF v_tx.status = 'paid' THEN
    UPDATE public.payment_events
      SET processing_status = 'duplicate', reason_code = 'ALREADY_PAID'
      WHERE provider_event_key = _provider_event_key;
    RETURN jsonb_build_object('result', 'duplicate');
  END IF;

  IF v_tx.amount_cents <> _amount_cents OR v_tx.currency <> upper(_currency) THEN
    UPDATE public.payment_transactions
      SET status = 'failed', failure_code = 'AMOUNT_OR_CURRENCY_MISMATCH', updated_at = now()
      WHERE id = v_tx.id;
    UPDATE public.payment_events
      SET processing_status = 'rejected', reason_code = 'AMOUNT_OR_CURRENCY_MISMATCH'
      WHERE provider_event_key = _provider_event_key;
    RETURN jsonb_build_object('result', 'rejected', 'reason', 'AMOUNT_OR_CURRENCY_MISMATCH');
  END IF;

  IF NOT _success THEN
    UPDATE public.payment_transactions
      SET status = 'failed', failure_code = 'PROVIDER_DECLINED',
          provider_transaction_id = _provider_transaction_id, updated_at = now()
      WHERE id = v_tx.id;
    RETURN jsonb_build_object('result', 'failed');
  END IF;

  UPDATE public.payment_transactions
    SET status = 'paid', failure_code = NULL,
        provider_transaction_id = _provider_transaction_id,
        verified_at = now(), updated_at = now()
    WHERE id = v_tx.id;

  IF v_tx.purpose = 'company_subscription' THEN
    SELECT * INTO v_subscription
    FROM public.subscriptions
    WHERE user_id = v_tx.user_id AND plan = 'premium_company'
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    v_old_expiry := v_subscription.expires_at;
    v_new_expiry := GREATEST(COALESCE(v_old_expiry, now()), now()) + interval '1 month';

    IF v_subscription.id IS NULL THEN
      INSERT INTO public.subscriptions(user_id, plan, started_at, expires_at, is_active)
      VALUES (v_tx.user_id, 'premium_company', now(), v_new_expiry, true)
      RETURNING * INTO v_subscription;
    ELSE
      UPDATE public.subscriptions
      SET is_active = true, expires_at = v_new_expiry
      WHERE id = v_subscription.id
      RETURNING * INTO v_subscription;
    END IF;

    UPDATE public.companies
      SET subscription_plan = 'premium_company',
          subscription_expires_at = v_new_expiry,
          subscription_updated_at = now()
      WHERE id = v_tx.company_id AND owner_id = v_tx.user_id;

    INSERT INTO public.subscription_events(
      subscription_id, payment_transaction_id, event_type,
      from_expires_at, to_expires_at, actor_user_id
    ) VALUES (
      v_subscription.id, v_tx.id,
      CASE WHEN v_old_expiry IS NULL THEN 'activated' ELSE 'renewed' END,
      v_old_expiry, v_new_expiry, v_tx.user_id
    );
  ELSIF v_tx.purpose = 'marketplace_order' THEN
    UPDATE public.wholesale_orders
      SET payment_status = 'paid', updated_at = now()
      WHERE id = v_tx.order_id AND buyer_id = v_tx.user_id;
  END IF;

  RETURN jsonb_build_object('result', 'paid');
END;
$$;

REVOKE ALL ON FUNCTION public.process_verified_paymob_event(
  uuid, text, text, text, bigint, text, boolean, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_verified_paymob_event(
  uuid, text, text, text, bigint, text, boolean, jsonb
) TO service_role;

-- Payouts remain manual. Close cross-wallet and mutable-request loopholes.
ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS paid_reference text,
  ADD COLUMN IF NOT EXISTS paid_proof_url text,
  ADD COLUMN IF NOT EXISTS paid_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.payout_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_request_id uuid NOT NULL REFERENCES public.payout_requests(id) ON DELETE RESTRICT,
  from_status public.payout_status,
  to_status public.payout_status NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  paid_reference text,
  paid_proof_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payout_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payout_events FROM anon, authenticated;
GRANT SELECT ON public.payout_events TO authenticated;
GRANT ALL ON public.payout_events TO service_role;
CREATE POLICY "Users view own payout events"
  ON public.payout_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.payout_requests pr
      WHERE pr.id = payout_events.payout_request_id
        AND (pr.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS payout_requests_one_open_per_user_idx
  ON public.payout_requests(user_id)
  WHERE status IN ('pending', 'approved', 'processing');

CREATE OR REPLACE FUNCTION public.protect_payout_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.wallets w
    WHERE w.id = NEW.wallet_id AND w.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'PAYOUT_WALLET_OWNERSHIP_MISMATCH';
  END IF;
  IF NEW.payout_method_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.payout_methods pm
    WHERE pm.id = NEW.payout_method_id AND pm.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'PAYOUT_METHOD_OWNERSHIP_MISMATCH';
  END IF;

  IF TG_OP = 'UPDATE'
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.wallet_id IS DISTINCT FROM OLD.wallet_id
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.payout_method_id IS DISTINCT FROM OLD.payout_method_id
       OR NEW.notes IS DISTINCT FROM OLD.notes
       OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
       OR NEW.status NOT IN ('pending', 'cancelled') THEN
      RAISE EXCEPTION 'PAYOUT_REQUEST_IMMUTABLE';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_payout_request ON public.payout_requests;
CREATE TRIGGER trg_protect_payout_request
  BEFORE INSERT OR UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.protect_payout_request();

CREATE OR REPLACE FUNCTION public.protect_open_payout_method()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.payout_requests pr
    WHERE pr.payout_method_id = OLD.id AND pr.status IN ('pending', 'approved', 'processing')
  ) THEN
    RAISE EXCEPTION 'PAYOUT_METHOD_LOCKED_BY_OPEN_REQUEST';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_open_payout_method ON public.payout_methods;
CREATE TRIGGER trg_protect_open_payout_method
  BEFORE UPDATE OR DELETE ON public.payout_methods
  FOR EACH ROW EXECUTE FUNCTION public.protect_open_payout_method();

REVOKE ALL ON FUNCTION public.protect_payout_request() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_open_payout_method() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_transition_payout(
  _payout_id uuid,
  _action text,
  _admin_notes text DEFAULT NULL,
  _paid_reference text DEFAULT NULL,
  _paid_proof_url text DEFAULT NULL
)
RETURNS public.payout_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.payout_requests%ROWTYPE;
  v_new public.payout_requests%ROWTYPE;
  v_target public.payout_status;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_old FROM public.payout_requests
  WHERE id = _payout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAYOUT_NOT_FOUND'; END IF;

  v_target := CASE _action
    WHEN 'approve' THEN 'approved'::public.payout_status
    WHEN 'start_processing' THEN 'processing'::public.payout_status
    WHEN 'reject' THEN 'rejected'::public.payout_status
    WHEN 'paid' THEN 'paid'::public.payout_status
    ELSE NULL
  END;
  IF v_target IS NULL THEN RAISE EXCEPTION 'INVALID_PAYOUT_ACTION'; END IF;

  IF (v_old.status = 'pending' AND v_target NOT IN ('approved', 'rejected'))
     OR (v_old.status = 'approved' AND v_target NOT IN ('processing', 'rejected'))
     OR (v_old.status = 'processing' AND v_target NOT IN ('paid', 'rejected')) THEN
    RAISE EXCEPTION 'INVALID_PAYOUT_TRANSITION';
  END IF;

  IF v_target = 'paid'
     AND (NULLIF(trim(_paid_reference), '') IS NULL
          OR NULLIF(trim(_paid_proof_url), '') IS NULL) THEN
    RAISE EXCEPTION 'PAYOUT_PROOF_REQUIRED';
  END IF;

  UPDATE public.payout_requests
  SET status = v_target,
      admin_notes = NULLIF(trim(_admin_notes), ''),
      paid_reference = CASE WHEN v_target = 'paid' THEN trim(_paid_reference) ELSE paid_reference END,
      paid_proof_url = CASE WHEN v_target = 'paid' THEN trim(_paid_proof_url) ELSE paid_proof_url END,
      paid_by = CASE WHEN v_target = 'paid' THEN auth.uid() ELSE paid_by END,
      updated_at = now()
  WHERE id = _payout_id
  RETURNING * INTO v_new;

  INSERT INTO public.payout_events(
    payout_request_id, from_status, to_status, actor_user_id, notes,
    paid_reference, paid_proof_url
  ) VALUES (
    v_new.id, v_old.status, v_new.status, auth.uid(), NULLIF(trim(_admin_notes), ''),
    CASE WHEN v_new.status = 'paid' THEN v_new.paid_reference END,
    CASE WHEN v_new.status = 'paid' THEN v_new.paid_proof_url END
  );
  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_transition_payout(uuid, text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_transition_payout(uuid, text, text, text, text)
  TO authenticated;

-- Include the processing state in hold refunds.
CREATE OR REPLACE FUNCTION public.payout_wallet_flow()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_avail numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT balance INTO v_avail FROM public.wallets WHERE id = NEW.wallet_id FOR UPDATE;
    IF v_avail IS NULL OR v_avail < NEW.amount THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
    UPDATE public.wallets
      SET balance = balance - NEW.amount,
          pending_balance = pending_balance + NEW.amount
      WHERE id = NEW.wallet_id;
    INSERT INTO public.wallet_transactions(wallet_id, amount, currency, reason, reference_id, reference_type, notes)
      VALUES (NEW.wallet_id, 0, NEW.currency, 'payout', NEW.id, 'payout_request', 'Payout requested - held');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('rejected','cancelled') AND OLD.status IN ('pending','approved','processing') THEN
      UPDATE public.wallets
        SET balance = balance + OLD.amount,
            pending_balance = GREATEST(pending_balance - OLD.amount, 0)
        WHERE id = OLD.wallet_id;
      INSERT INTO public.wallet_transactions(wallet_id, amount, currency, reason, reference_id, reference_type, notes)
        VALUES (OLD.wallet_id, OLD.amount, OLD.currency, 'payout', OLD.id, 'payout_request', 'Payout ' || NEW.status || ' - refunded');
      NEW.processed_at := now();
    ELSIF NEW.status = 'paid' AND OLD.status = 'processing' THEN
      UPDATE public.wallets
        SET pending_balance = GREATEST(pending_balance - OLD.amount, 0),
            total_paid_out = total_paid_out + OLD.amount
        WHERE id = OLD.wallet_id;
      INSERT INTO public.wallet_transactions(wallet_id, amount, currency, reason, reference_id, reference_type, notes)
        VALUES (OLD.wallet_id, -OLD.amount, OLD.currency, 'payout', OLD.id, 'payout_request', 'Payout paid');
      NEW.processed_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
