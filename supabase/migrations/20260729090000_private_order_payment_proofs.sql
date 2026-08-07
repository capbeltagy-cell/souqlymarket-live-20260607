-- Private storage for financial proof documents.
-- Additive only: existing proof_url values remain readable during migration.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Payment proof owner uploads" ON storage.objects;
CREATE POLICY "Payment proof owner uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Payment proof owner reads" ON storage.objects;
CREATE POLICY "Payment proof owner reads"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

DROP POLICY IF EXISTS "Payment proof owner deletes unsubmitted" ON storage.objects;
CREATE POLICY "Payment proof owner deletes unsubmitted"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND NOT EXISTS (
    SELECT 1
    FROM public.payment_proofs proof
    WHERE proof.proof_url = name
  )
);

COMMENT ON COLUMN public.payment_proofs.proof_url IS
  'Private payment-proofs object path for new records; legacy rows may contain a signed URL.';

-- Preserve every historical row while deterministically superseding duplicate
-- pending submissions that the legacy select-then-insert flow could create.
WITH ranked_pending AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY order_id
           ORDER BY created_at DESC, id DESC
         ) AS position
  FROM public.payment_proofs
  WHERE status = 'pending'
)
UPDATE public.payment_proofs AS proof
SET status = 'rejected',
    review_note = coalesce(proof.review_note, 'Superseded by a newer pending proof'),
    reviewed_at = coalesce(proof.reviewed_at, now()),
    updated_at = now()
FROM ranked_pending
WHERE proof.id = ranked_pending.id
  AND ranked_pending.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS payment_proofs_one_pending_per_order_idx
ON public.payment_proofs (order_id)
WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.validate_order_payment_proof()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_order public.wholesale_orders%ROWTYPE;
  method_active boolean;
BEGIN
  SELECT *
  INTO target_order
  FROM public.wholesale_orders
  WHERE id = NEW.order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF auth.uid() IS NULL OR target_order.buyer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the buyer can submit a payment proof';
  END IF;
  IF target_order.payment_status = 'paid' THEN
    RAISE EXCEPTION 'Order is already paid';
  END IF;
  IF abs(NEW.amount - target_order.total_amount) > 0.01
     OR upper(NEW.currency) <> upper(COALESCE(target_order.currency, 'EGP')) THEN
    RAISE EXCEPTION 'Payment amount or currency does not match the order';
  END IF;

  SELECT is_active INTO method_active
  FROM public.payment_methods
  WHERE id = NEW.payment_method_id;
  IF NOT COALESCE(method_active, false) THEN
    RAISE EXCEPTION 'Payment method is not active';
  END IF;

  NEW.buyer_id := target_order.buyer_id;
  NEW.currency := upper(COALESCE(target_order.currency, 'EGP'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_order_payment_proof ON public.payment_proofs;
CREATE TRIGGER trg_validate_order_payment_proof
BEFORE INSERT ON public.payment_proofs
FOR EACH ROW EXECUTE FUNCTION public.validate_order_payment_proof();

CREATE OR REPLACE FUNCTION public.mark_order_payment_pending_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.wholesale_orders
  SET payment_status = 'pending_review', updated_at = now()
  WHERE id = NEW.order_id
    AND buyer_id = NEW.buyer_id
    AND payment_status <> 'paid';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_order_payment_pending_review ON public.payment_proofs;
CREATE TRIGGER trg_mark_order_payment_pending_review
AFTER INSERT ON public.payment_proofs
FOR EACH ROW EXECUTE FUNCTION public.mark_order_payment_pending_review();
