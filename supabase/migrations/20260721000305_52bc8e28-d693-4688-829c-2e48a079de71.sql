-- Fix payment_proofs INSERT policy: verify order belongs to the buyer
DROP POLICY IF EXISTS pp_buyer_insert ON public.payment_proofs;
CREATE POLICY pp_buyer_insert ON public.payment_proofs
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND review_note IS NULL
    AND EXISTS (
      SELECT 1 FROM public.wholesale_orders o
      WHERE o.id = payment_proofs.order_id
        AND o.buyer_id = auth.uid()
        AND o.payment_status IS DISTINCT FROM 'paid'
        AND payment_proofs.amount = o.total_amount
        AND payment_proofs.currency = o.currency
    )
    AND EXISTS (
      SELECT 1 FROM public.payment_methods pm
      WHERE pm.id = payment_proofs.payment_method_id
        AND pm.is_active = true
    )
  );

-- Fix payout_requests INSERT policy: verify wallet belongs to the user
DROP POLICY IF EXISTS "Users create own payouts" ON public.payout_requests;
CREATE POLICY "Users create own payouts" ON public.payout_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND admin_notes IS NULL
    AND processed_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.wallets w
      WHERE w.id = payout_requests.wallet_id
        AND w.user_id = auth.uid()
    )
  );
