-- Fix payment_proofs INSERT policy: verify order belongs to the buyer
DROP POLICY IF EXISTS pp_buyer_insert ON public.payment_proofs;
CREATE POLICY pp_buyer_insert ON public.payment_proofs
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id
    AND EXISTS (
      SELECT 1 FROM public.wholesale_orders o
      WHERE o.id = payment_proofs.order_id
        AND o.buyer_id = auth.uid()
    )
  );

-- Fix payout_requests INSERT policy: verify wallet belongs to the user
DROP POLICY IF EXISTS "Users create own payouts" ON public.payout_requests;
CREATE POLICY "Users create own payouts" ON public.payout_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.wallets w
      WHERE w.id = payout_requests.wallet_id
        AND w.user_id = auth.uid()
    )
  );