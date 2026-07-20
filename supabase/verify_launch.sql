-- Souqly launch verification. Read-only: it never changes production data.
-- Run after launch_bundle.sql. Any missing critical object raises an exception.

DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
  item text;
BEGIN
  FOREACH item IN ARRAY ARRAY[
    'profiles','user_roles','companies','agents','listings','stores','store_categories',
    'store_coupons','store_coupon_usage','store_followers','store_reviews','store_staff',
    'wholesale_orders','notifications','audit_logs','auth_rate_limits','user_addresses'
  ] LOOP
    IF to_regclass('public.' || item) IS NULL THEN missing := array_append(missing, 'table public.' || item); END IF;
  END LOOP;

  FOREACH item IN ARRAY ARRAY[
    'public.consume_auth_rate_limit(text,integer,integer)',
    'public.recompute_store_coupon_used_count()',
    'public.protect_store_review_fields()',
    'public.log_audit_event()'
  ] LOOP
    IF to_regprocedure(item) IS NULL THEN missing := array_append(missing, 'function ' || item); END IF;
  END LOOP;

  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'Launch verification failed. Missing: %', array_to_string(missing, ', ');
  END IF;
END $$;

-- Required columns.
DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listings' AND column_name='store_id') THEN missing := array_append(missing, 'listings.store_id'); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listings' AND column_name='stock_quantity') THEN missing := array_append(missing, 'listings.stock_quantity'); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='wholesale_orders' AND column_name='store_id') THEN missing := array_append(missing, 'wholesale_orders.store_id'); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='wholesale_orders' AND column_name='checkout_session_id') THEN missing := array_append(missing, 'wholesale_orders.checkout_session_id'); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_reviews' AND column_name='order_id') THEN missing := array_append(missing, 'store_reviews.order_id'); END IF;
  IF cardinality(missing) > 0 THEN RAISE EXCEPTION 'Missing launch columns: %', array_to_string(missing, ', '); END IF;
END $$;

-- Indexes and triggers.
DO $$
DECLARE missing text[] := ARRAY[]::text[]; item text;
BEGIN
  FOREACH item IN ARRAY ARRAY[
    'wholesale_orders_store_created_idx','listings_store_status_idx',
    'store_coupon_usage_order_uidx','auth_rate_limits_window_idx'
  ] LOOP
    IF to_regclass('public.' || item) IS NULL THEN missing := array_append(missing, 'index ' || item); END IF;
  END LOOP;
  FOREACH item IN ARRAY ARRAY[
    'trg_recompute_store_coupon_used_count','audit_stores','audit_wholesale_orders',
    'trg_protect_store_review_fields'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname=item AND NOT tgisinternal) THEN missing := array_append(missing, 'trigger ' || item); END IF;
  END LOOP;
  IF cardinality(missing) > 0 THEN RAISE EXCEPTION 'Missing launch objects: %', array_to_string(missing, ', '); END IF;
END $$;

-- RLS and core policies, including Storage.
DO $$
DECLARE missing text[] := ARRAY[]::text[];
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('stores','store_coupons','store_reviews','auth_rate_limits')
      AND NOT c.relrowsecurity
  ) THEN missing := array_append(missing, 'RLS on one or more launch tables'); END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='store_reviews' AND policyname='store_reviews_verified_buyer_insert') THEN missing := array_append(missing, 'store review verified buyer policy'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stores' AND policyname='stores_public_read_published') THEN missing := array_append(missing, 'stores public read policy'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname ILIKE '%listing%') THEN missing := array_append(missing, 'listing media storage policy'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname ILIKE '%company-assets%') THEN missing := array_append(missing, 'company assets storage policy'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname ILIKE '%avatars%') THEN missing := array_append(missing, 'avatars storage policy'); END IF;

  IF cardinality(missing) > 0 THEN RAISE EXCEPTION 'Security verification failed: %', array_to_string(missing, ', '); END IF;
END $$;

-- Human-readable result set for the SQL editor.
SELECT 'tables' AS category, count(*)::text AS result FROM information_schema.tables WHERE table_schema='public'
UNION ALL SELECT 'public policies', count(*)::text FROM pg_policies WHERE schemaname='public'
UNION ALL SELECT 'storage policies', count(*)::text FROM pg_policies WHERE schemaname='storage'
UNION ALL SELECT 'launch triggers', count(*)::text FROM pg_trigger WHERE tgname IN ('trg_recompute_store_coupon_used_count','audit_stores','audit_wholesale_orders','trg_protect_store_review_fields') AND NOT tgisinternal
UNION ALL SELECT 'verification', 'PASS';
