-- Prevent duplicate purchases when checkout is retried after a partial failure.
ALTER TABLE public.wholesale_orders
  ADD COLUMN IF NOT EXISTS checkout_session_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS wholesale_orders_checkout_item_unique
  ON public.wholesale_orders (buyer_id, checkout_session_id, product_listing_id)
  WHERE checkout_session_id IS NOT NULL AND product_listing_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS wholesale_orders_checkout_session_idx
  ON public.wholesale_orders (buyer_id, checkout_session_id)
  WHERE checkout_session_id IS NOT NULL;
