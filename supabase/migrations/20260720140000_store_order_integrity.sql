-- Store checkout integrity, coupon counters, and admin audit coverage.

CREATE INDEX IF NOT EXISTS wholesale_orders_store_created_idx
  ON public.wholesale_orders (store_id, created_at DESC)
  WHERE store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS listings_store_status_idx
  ON public.listings (store_id, status, created_at DESC)
  WHERE store_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS store_coupon_usage_order_uidx
  ON public.store_coupon_usage (coupon_id, order_id)
  WHERE order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.recompute_store_coupon_used_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon_id uuid := COALESCE(NEW.coupon_id, OLD.coupon_id);
BEGIN
  UPDATE public.store_coupons
     SET used_count = (
       SELECT count(*)::integer
         FROM public.store_coupon_usage
        WHERE coupon_id = v_coupon_id
     )
   WHERE id = v_coupon_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_store_coupon_used_count() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_recompute_store_coupon_used_count ON public.store_coupon_usage;
CREATE TRIGGER trg_recompute_store_coupon_used_count
AFTER INSERT OR DELETE ON public.store_coupon_usage
FOR EACH ROW EXECUTE FUNCTION public.recompute_store_coupon_used_count();

DROP TRIGGER IF EXISTS audit_stores ON public.stores;
CREATE TRIGGER audit_stores
AFTER INSERT OR UPDATE OR DELETE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_wholesale_orders ON public.wholesale_orders;
CREATE TRIGGER audit_wholesale_orders
AFTER INSERT OR UPDATE OR DELETE ON public.wholesale_orders
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
