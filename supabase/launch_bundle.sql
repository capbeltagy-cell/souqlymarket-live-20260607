-- Souqly production launch bundle
-- Scope: post-baseline launch hardening only. This file never drops tables or data.
-- Safe to rerun: tables/indexes use IF NOT EXISTS; functions are replaced; convergent
-- policies/triggers are dropped and recreated because PostgreSQL has no CREATE OR REPLACE
-- for these object types.

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
SELECT pg_advisory_xact_lock(hashtext('souqly_launch_bundle_v1'));

-- ---------------------------------------------------------------------------
-- 0. Baseline dependency guard — fail before changing anything.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
  relation_name text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY[
    'public.stores', 'public.listings', 'public.wholesale_orders',
    'public.store_coupons', 'public.store_coupon_usage', 'public.store_reviews'
  ] LOOP
    IF to_regclass(relation_name) IS NULL THEN
      missing := array_append(missing, relation_name);
    END IF;
  END LOOP;

  IF to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL THEN
    missing := array_append(missing, 'public.has_role(uuid, app_role)');
  END IF;
  IF to_regprocedure('public.log_audit_event()') IS NULL THEN
    missing := array_append(missing, 'public.log_audit_event()');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='wholesale_orders' AND column_name='store_id') THEN
    missing := array_append(missing, 'public.wholesale_orders.store_id');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_reviews' AND column_name='order_id') THEN
    missing := array_append(missing, 'public.store_reviews.order_id');
  END IF;

  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'Souqly baseline is incomplete. Missing: %', array_to_string(missing, ', ');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Store/order integrity and query indexes.
-- ---------------------------------------------------------------------------
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
  v_coupon_id uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.coupon_id ELSE NEW.coupon_id END;
BEGIN
  UPDATE public.store_coupons
     SET used_count = (
       SELECT count(*)::integer
         FROM public.store_coupon_usage
        WHERE coupon_id = v_coupon_id
     )
   WHERE id = v_coupon_id;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_store_coupon_used_count() FROM PUBLIC;

-- Trigger replacement is metadata-only and does not remove table data.
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

-- ---------------------------------------------------------------------------
-- 2. Database-backed authenticated rate limiting.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  user_id uuid NOT NULL,
  action text NOT NULL,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (user_id, action)
);

REVOKE ALL ON public.auth_rate_limits FROM anon, authenticated;
GRANT ALL ON public.auth_rate_limits TO service_role;
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_auth_rate_limit(
  p_action text,
  p_max_requests integer,
  p_window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row public.auth_rate_limits%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RETURN false; END IF;
  IF p_action IS NULL OR length(p_action) > 80 OR p_max_requests < 1
     OR p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'Invalid rate limit parameters';
  END IF;

  INSERT INTO public.auth_rate_limits (user_id, action, request_count)
  VALUES (v_user_id, p_action, 0)
  ON CONFLICT (user_id, action) DO NOTHING;

  SELECT * INTO v_row
    FROM public.auth_rate_limits
   WHERE user_id = v_user_id AND action = p_action
   FOR UPDATE;

  IF v_row.window_started_at <= now() - make_interval(secs => p_window_seconds) THEN
    UPDATE public.auth_rate_limits
       SET window_started_at = now(), request_count = 1
     WHERE user_id = v_user_id AND action = p_action;
    RETURN true;
  END IF;
  IF v_row.request_count >= p_max_requests THEN RETURN false; END IF;

  UPDATE public.auth_rate_limits
     SET request_count = request_count + 1
   WHERE user_id = v_user_id AND action = p_action;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_auth_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_auth_rate_limit(text, integer, integer) TO authenticated;

CREATE INDEX IF NOT EXISTS auth_rate_limits_window_idx
  ON public.auth_rate_limits (window_started_at);

-- ---------------------------------------------------------------------------
-- 3. Verified-purchase store reviews and immutable review ownership fields.
-- ---------------------------------------------------------------------------
-- Policy replacement is required to converge an existing installation safely.
DROP POLICY IF EXISTS "store_reviews_author_insert" ON public.store_reviews;
DROP POLICY IF EXISTS "store_reviews_verified_buyer_insert" ON public.store_reviews;
CREATE POLICY "store_reviews_verified_buyer_insert" ON public.store_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND order_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.wholesale_orders o
       WHERE o.id = order_id
         AND o.store_id = store_id
         AND o.buyer_id = auth.uid()
         AND o.status IN ('delivered', 'completed')
    )
  );

CREATE OR REPLACE FUNCTION public.protect_store_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := public.has_role(auth.uid(), 'admin');
  v_is_store_owner boolean;
BEGIN
  IF v_is_admin THEN RETURN NEW; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.stores s
     WHERE s.id = OLD.store_id AND s.owner_id = auth.uid()
  ) INTO v_is_store_owner;

  IF v_is_store_owner THEN
    NEW.store_id := OLD.store_id; NEW.user_id := OLD.user_id; NEW.order_id := OLD.order_id;
    NEW.rating := OLD.rating; NEW.body := OLD.body; NEW.status := OLD.status;
    RETURN NEW;
  END IF;

  IF OLD.user_id = auth.uid() THEN
    NEW.store_id := OLD.store_id; NEW.user_id := OLD.user_id; NEW.order_id := OLD.order_id;
    NEW.seller_reply := OLD.seller_reply; NEW.status := OLD.status;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not allowed to update this review';
END;
$$;

REVOKE ALL ON FUNCTION public.protect_store_review_fields() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_protect_store_review_fields ON public.store_reviews;
CREATE TRIGGER trg_protect_store_review_fields
BEFORE UPDATE ON public.store_reviews
FOR EACH ROW EXECUTE FUNCTION public.protect_store_review_fields();

COMMIT;
