ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS track_inventory boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_quantity integer,
  ADD COLUMN IF NOT EXISTS min_order_quantity integer NOT NULL DEFAULT 1;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_stock_quantity_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_stock_quantity_check
  CHECK (stock_quantity IS NULL OR stock_quantity >= 0);

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_min_order_quantity_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_min_order_quantity_check
  CHECK (min_order_quantity >= 1);
