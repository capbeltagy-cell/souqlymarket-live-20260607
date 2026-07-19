-- Keep the payment states used by the checkout/proof workflow in sync with the
-- canonical orders table before installing inventory automation.
ALTER TABLE public.wholesale_orders
  DROP CONSTRAINT IF EXISTS wholesale_orders_payment_status_check;

ALTER TABLE public.wholesale_orders
  ADD CONSTRAINT wholesale_orders_payment_status_check CHECK (
    payment_status IN (
      'unpaid','pending_approval','pending_review','held','paid','rejected','refunded'
    )
  );

ALTER TABLE public.wholesale_orders
  ADD COLUMN IF NOT EXISTS inventory_reserved_at timestamptz,
  ADD COLUMN IF NOT EXISTS inventory_released_at timestamptz;

-- Reserve tracked inventory in the same transaction that marks an order paid.
-- PostgreSQL's row update lock makes concurrent approvals safe: only one order
-- can consume the final units. Inventory is released once on refund/cancellation,
-- rejection or return, with timestamps acting as an idempotency guard.
CREATE OR REPLACE FUNCTION public.sync_paid_order_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_id uuid;
  v_tracks_inventory boolean;
  v_changed integer;
BEGIN
  v_listing_id := COALESCE(NEW.product_listing_id, NEW.listing_id);

  IF v_listing_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT track_inventory
    INTO v_tracks_inventory
    FROM public.listings
   WHERE id = v_listing_id;

  IF NOT COALESCE(v_tracks_inventory, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.payment_status = 'paid'
     AND OLD.payment_status IS DISTINCT FROM 'paid'
     AND NEW.inventory_reserved_at IS NULL THEN
    UPDATE public.listings
       SET stock_quantity = stock_quantity - NEW.quantity
     WHERE id = v_listing_id
       AND track_inventory = true
       AND stock_quantity >= NEW.quantity;

    GET DIAGNOSTICS v_changed = ROW_COUNT;
    IF v_changed <> 1 THEN
      RAISE EXCEPTION USING
        MESSAGE = 'الكمية المطلوبة لم تعد متاحة في المخزون',
        ERRCODE = 'P0001';
    END IF;

    NEW.inventory_reserved_at := now();
    NEW.inventory_released_at := NULL;
  END IF;

  IF NEW.inventory_reserved_at IS NOT NULL
     AND NEW.inventory_released_at IS NULL
     AND (
       NEW.payment_status IN ('rejected', 'refunded')
       OR NEW.status IN ('rejected', 'cancelled', 'returned')
     ) THEN
    UPDATE public.listings
       SET stock_quantity = COALESCE(stock_quantity, 0) + NEW.quantity
     WHERE id = v_listing_id
       AND track_inventory = true;

    NEW.inventory_released_at := now();
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_paid_order_inventory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_paid_order_inventory() TO service_role;

DROP TRIGGER IF EXISTS trg_sync_paid_order_inventory ON public.wholesale_orders;
CREATE TRIGGER trg_sync_paid_order_inventory
BEFORE UPDATE OF payment_status, status ON public.wholesale_orders
FOR EACH ROW EXECUTE FUNCTION public.sync_paid_order_inventory();
