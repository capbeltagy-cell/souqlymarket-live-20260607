ALTER TABLE public.wholesale_orders
  ADD COLUMN IF NOT EXISTS shipping_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_eta_min_days integer,
  ADD COLUMN IF NOT EXISTS shipping_eta_max_days integer;

ALTER TABLE public.wholesale_orders DROP CONSTRAINT IF EXISTS wholesale_orders_shipping_amount_check;
ALTER TABLE public.wholesale_orders ADD CONSTRAINT wholesale_orders_shipping_amount_check
  CHECK (shipping_amount >= 0);

ALTER TABLE public.wholesale_orders DROP CONSTRAINT IF EXISTS wholesale_orders_shipping_eta_check;
ALTER TABLE public.wholesale_orders ADD CONSTRAINT wholesale_orders_shipping_eta_check
  CHECK (
    shipping_eta_min_days IS NULL OR
    (shipping_eta_min_days >= 0 AND shipping_eta_max_days >= shipping_eta_min_days)
  );
