-- Manual subscription payment workflow.
-- TEST FIRST. Do not apply to Production without a migration/RLS preflight.

ALTER TABLE public.payment_transactions
  DROP CONSTRAINT IF EXISTS payment_transactions_provider_check;
ALTER TABLE public.payment_transactions
  ADD CONSTRAINT payment_transactions_provider_check
  CHECK (provider IN ('paymob', 'manual'));

CREATE TABLE IF NOT EXISTS public.manual_payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  plan public.subscription_plan NOT NULL DEFAULT 'premium_company'
    CHECK (plan = 'premium_company'),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'EGP' CHECK (currency = 'EGP'),
  payment_method text NOT NULL CHECK (payment_method IN ('instapay', 'vodafone_cash')),
  destination_number text NOT NULL,
  sender_phone text NOT NULL,
  transfer_reference text,
  transferred_at timestamptz NOT NULL,
  proof_path text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  payment_transaction_id uuid REFERENCES public.payment_transactions(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT manual_payment_sender_phone_chk
    CHECK (sender_phone ~ '^\+?[0-9]{10,15}$'),
  CONSTRAINT manual_payment_reference_chk
    CHECK (transfer_reference IS NULL OR char_length(transfer_reference) <= 100),
  CONSTRAINT manual_payment_notes_chk
    CHECK (notes IS NULL OR char_length(notes) <= 500),
  CONSTRAINT manual_payment_proof_owner_path_chk
    CHECK (split_part(proof_path, '/', 1) = user_id::text)
);

CREATE UNIQUE INDEX IF NOT EXISTS manual_payment_one_pending_per_company_idx
  ON public.manual_payment_requests(company_id)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS manual_payment_user_created_idx
  ON public.manual_payment_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS manual_payment_admin_queue_idx
  ON public.manual_payment_requests(status, created_at DESC);

ALTER TABLE public.manual_payment_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.manual_payment_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.manual_payment_requests TO authenticated;
GRANT ALL ON public.manual_payment_requests TO service_role;

DROP POLICY IF EXISTS "Users read own manual payments" ON public.manual_payment_requests;
CREATE POLICY "Users read own manual payments"
  ON public.manual_payment_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'manual-payment-proofs',
  'manual-payment-proofs',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users upload own manual proof" ON storage.objects;
CREATE POLICY "Users upload own manual proof"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'manual-payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users read own manual proof" ON storage.objects;
CREATE POLICY "Users read own manual proof"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'manual-payment-proofs'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

DROP POLICY IF EXISTS "Users delete own unsubmitted manual proof" ON storage.objects;
CREATE POLICY "Users delete own unsubmitted manual proof"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'manual-payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND NOT EXISTS (
      SELECT 1
      FROM public.manual_payment_requests request
      WHERE request.proof_path = storage.objects.name
    )
  );

INSERT INTO public.payment_methods (
  code, name_ar, name_en, instructions_ar, instructions_en,
  account_details, icon, is_active, sort_order
)
VALUES
  (
    'instapay',
    'إنستا باي',
    'InstaPay',
    'حوّل المبلغ إلى الرقم الظاهر ثم ارفع صورة التحويل.',
    'Transfer the displayed amount, then upload the transfer receipt.',
    '{"phone":"+201140949424"}'::jsonb,
    '💳',
    true,
    10
  ),
  (
    'vodafone_cash',
    'فودافون كاش',
    'Vodafone Cash',
    'حوّل المبلغ إلى الرقم الظاهر ثم ارفع صورة التحويل.',
    'Transfer the displayed amount, then upload the transfer receipt.',
    '{"phone":"+201140949424"}'::jsonb,
    '📱',
    true,
    20
  )
ON CONFLICT (code) DO UPDATE
SET account_details = EXCLUDED.account_details,
    instructions_ar = EXCLUDED.instructions_ar,
    instructions_en = EXCLUDED.instructions_en,
    is_active = true,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.submit_manual_subscription_payment(
  _company_id uuid,
  _payment_method text,
  _sender_phone text,
  _transfer_reference text,
  _transferred_at timestamptz,
  _proof_path text,
  _notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_amount_cents bigint;
  v_request_id uuid;
  v_destination text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  IF _payment_method NOT IN ('instapay', 'vodafone_cash') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD';
  END IF;
  IF _sender_phone !~ '^\+?[0-9]{10,15}$' THEN
    RAISE EXCEPTION 'INVALID_SENDER_PHONE';
  END IF;
  IF _transferred_at > now() + interval '10 minutes'
     OR _transferred_at < now() - interval '7 days' THEN
    RAISE EXCEPTION 'INVALID_TRANSFER_TIME';
  END IF;
  IF split_part(_proof_path, '/', 1) <> v_user_id::text THEN
    RAISE EXCEPTION 'INVALID_PROOF_PATH';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = _company_id AND c.owner_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN_COMPANY';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.manual_payment_requests r
    WHERE r.company_id = _company_id AND r.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'PAYMENT_ALREADY_PENDING';
  END IF;

  SELECT (COALESCE(ps.subscription_plan_price_egp, 499) * 100)::bigint
  INTO v_amount_cents
  FROM public.platform_settings ps
  LIMIT 1;
  v_amount_cents := COALESCE(v_amount_cents, 49900);

  SELECT COALESCE(pm.account_details->>'phone', '+201140949424')
  INTO v_destination
  FROM public.payment_methods pm
  WHERE pm.code = _payment_method AND pm.is_active;
  IF v_destination IS NULL THEN
    RAISE EXCEPTION 'PAYMENT_METHOD_UNAVAILABLE';
  END IF;

  INSERT INTO public.manual_payment_requests (
    user_id, company_id, amount_cents, payment_method, destination_number,
    sender_phone, transfer_reference, transferred_at, proof_path, notes
  )
  VALUES (
    v_user_id, _company_id, v_amount_cents, _payment_method, v_destination,
    _sender_phone, NULLIF(trim(_transfer_reference), ''), _transferred_at,
    _proof_path, NULLIF(trim(_notes), '')
  )
  RETURNING id INTO v_request_id;

  INSERT INTO public.audit_logs(user_id, action, table_name, record_id, new_data)
  VALUES (
    v_user_id, 'MANUAL_PAYMENT_SUBMITTED', 'manual_payment_requests',
    v_request_id::text,
    jsonb_build_object('company_id', _company_id, 'method', _payment_method)
  );
  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_manual_subscription_payment(
  uuid, text, text, text, timestamptz, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_manual_subscription_payment(
  uuid, text, text, text, timestamptz, text, text
) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_manual_subscription_payment(
  _request_id uuid,
  _action text,
  _rejection_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_request public.manual_payment_requests%ROWTYPE;
  v_subscription public.subscriptions%ROWTYPE;
  v_old_expiry timestamptz;
  v_new_expiry timestamptz;
  v_transaction_id uuid;
BEGIN
  IF v_admin_id IS NULL OR NOT public.has_role(v_admin_id, 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF _action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'INVALID_ACTION';
  END IF;
  IF _action = 'reject' AND char_length(trim(COALESCE(_rejection_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'REJECTION_REASON_REQUIRED';
  END IF;

  SELECT * INTO v_request
  FROM public.manual_payment_requests
  WHERE id = _request_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_REQUEST_NOT_FOUND';
  END IF;
  IF v_request.status <> 'pending' THEN
    RETURN jsonb_build_object('result', 'already_reviewed', 'status', v_request.status);
  END IF;

  IF _action = 'reject' THEN
    UPDATE public.manual_payment_requests
    SET status = 'rejected',
        rejection_reason = trim(_rejection_reason),
        reviewed_by = v_admin_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = v_request.id;

    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (
      v_request.user_id, 'payment', 'تم رفض إثبات الدفع',
      trim(_rejection_reason), '/manual-payment?companyId=' || v_request.company_id::text
    );
    INSERT INTO public.audit_logs(user_id, action, table_name, record_id, old_data, new_data)
    VALUES (
      v_admin_id, 'MANUAL_PAYMENT_REJECTED', 'manual_payment_requests',
      v_request.id::text, to_jsonb(v_request),
      jsonb_build_object('status', 'rejected', 'reason', trim(_rejection_reason))
    );
    RETURN jsonb_build_object('result', 'rejected');
  END IF;

  INSERT INTO public.payment_transactions (
    idempotency_key, user_id, company_id, purpose, plan, amount_cents,
    currency, provider, provider_transaction_id, status, verified_at
  )
  VALUES (
    v_request.id, v_request.user_id, v_request.company_id,
    'company_subscription', 'premium_company', v_request.amount_cents,
    v_request.currency, 'manual', 'manual:' || v_request.id::text, 'paid', now()
  )
  ON CONFLICT (idempotency_key) DO UPDATE
  SET status = 'paid', verified_at = COALESCE(public.payment_transactions.verified_at, now())
  RETURNING id INTO v_transaction_id;

  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE user_id = v_request.user_id AND plan = 'premium_company'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  v_old_expiry := v_subscription.expires_at;
  v_new_expiry := GREATEST(COALESCE(v_old_expiry, now()), now()) + interval '1 month';

  IF v_subscription.id IS NULL THEN
    INSERT INTO public.subscriptions(user_id, plan, started_at, expires_at, is_active)
    VALUES (v_request.user_id, 'premium_company', now(), v_new_expiry, true)
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
  WHERE id = v_request.company_id AND owner_id = v_request.user_id;

  INSERT INTO public.subscription_events (
    subscription_id, payment_transaction_id, event_type,
    from_expires_at, to_expires_at, actor_user_id
  )
  VALUES (
    v_subscription.id, v_transaction_id,
    CASE WHEN v_old_expiry IS NULL OR v_old_expiry <= now() THEN 'activated' ELSE 'renewed' END,
    v_old_expiry, v_new_expiry, v_admin_id
  );

  UPDATE public.manual_payment_requests
  SET status = 'approved',
      rejection_reason = NULL,
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      payment_transaction_id = v_transaction_id,
      updated_at = now()
  WHERE id = v_request.id;

  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (
    v_request.user_id, 'payment', 'تم اعتماد الدفع وتفعيل الاشتراك',
    'تم تفعيل باقة الشركة المميزة حتى ' || to_char(v_new_expiry, 'YYYY-MM-DD'),
    '/dashboard'
  );
  INSERT INTO public.audit_logs(user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    v_admin_id, 'MANUAL_PAYMENT_APPROVED', 'manual_payment_requests',
    v_request.id::text, to_jsonb(v_request),
    jsonb_build_object(
      'status', 'approved',
      'payment_transaction_id', v_transaction_id,
      'subscription_expires_at', v_new_expiry
    )
  );

  RETURN jsonb_build_object(
    'result', 'approved',
    'payment_transaction_id', v_transaction_id,
    'subscription_expires_at', v_new_expiry
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_manual_subscription_payment(uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_manual_subscription_payment(uuid, text, text)
  TO authenticated;
