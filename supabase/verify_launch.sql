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
    'wholesale_orders','notifications','audit_logs','auth_rate_limits','user_addresses',
    'company_members','company_invitations','crm_activities','inventory_locations',
    'inventory_movements'
  ] LOOP
    IF to_regclass('public.' || item) IS NULL THEN missing := array_append(missing, 'table public.' || item); END IF;
  END LOOP;

  FOREACH item IN ARRAY ARRAY[
    'public.consume_auth_rate_limit(text,integer,integer)',
    'public.recompute_store_coupon_used_count()',
    'public.protect_store_review_fields()',
    'public.log_audit_event()',
    'public.is_company_member(uuid,uuid)',
    'public.has_company_permission(uuid,text,uuid)',
    'public.adjust_company_inventory(uuid,integer,text,uuid)',
    'public.accept_company_invitation(text)',
    'public.has_permission(uuid,text)',
    'public.has_role(uuid,public.app_role)',
    'public.handle_new_user()',
    'public.enforce_company_member_owner_role()',
    'public.enforce_listing_owner()',
    'public.create_order_atomic(uuid,uuid,integer,text,text,jsonb,numeric,integer,integer,uuid,text,text,uuid)',
    'public.accept_quotation_atomic(uuid,jsonb)',
    'public.record_released_order_inventory()'
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
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listings' AND column_name='owner_id' AND is_nullable='NO') THEN missing := array_append(missing, 'listings.owner_id NOT NULL'); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listings' AND column_name='stock_quantity') THEN missing := array_append(missing, 'listings.stock_quantity'); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='wholesale_orders' AND column_name='store_id') THEN missing := array_append(missing, 'wholesale_orders.store_id'); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='wholesale_orders' AND column_name='checkout_session_id') THEN missing := array_append(missing, 'wholesale_orders.checkout_session_id'); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_reviews' AND column_name='order_id') THEN missing := array_append(missing, 'store_reviews.order_id'); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='assigned_to') THEN missing := array_append(missing, 'leads.assigned_to'); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='source') THEN missing := array_append(missing, 'leads.source'); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='estimated_value') THEN missing := array_append(missing, 'leads.estimated_value'); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='next_follow_up_at') THEN missing := array_append(missing, 'leads.next_follow_up_at'); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='tags') THEN missing := array_append(missing, 'leads.tags'); END IF;
  IF cardinality(missing) > 0 THEN RAISE EXCEPTION 'Missing launch columns: %', array_to_string(missing, ', '); END IF;
END $$;

-- Indexes and triggers.
DO $$
DECLARE missing text[] := ARRAY[]::text[]; item text;
BEGIN
  FOREACH item IN ARRAY ARRAY[
    'wholesale_orders_store_created_idx','listings_store_status_idx',
    'listings_owner_created_idx',
    'store_coupon_usage_order_uidx','auth_rate_limits_window_idx',
    'company_members_user_idx','company_members_company_idx',
    'company_invitations_pending_email_idx','company_invitations_company_idx',
    'leads_company_status_idx','leads_company_follow_up_idx','leads_assigned_to_idx',
    'crm_activities_lead_idx','crm_activities_company_idx',
    'inventory_locations_default_idx','inventory_movements_listing_idx',
    'inventory_movements_company_idx'
  ] LOOP
    IF to_regclass('public.' || item) IS NULL THEN missing := array_append(missing, 'index ' || item); END IF;
  END LOOP;
  FOREACH item IN ARRAY ARRAY[
    'trg_recompute_store_coupon_used_count','audit_stores','audit_wholesale_orders',
    'trg_protect_store_review_fields','trg_sync_company_owner_membership',
    'trg_enforce_company_member_owner_role',
    'trg_enforce_listing_owner','trg_record_released_order_inventory'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname=item AND NOT tgisinternal) THEN missing := array_append(missing, 'trigger ' || item); END IF;
  END LOOP;
  IF cardinality(missing) > 0 THEN RAISE EXCEPTION 'Missing launch objects: %', array_to_string(missing, ', '); END IF;
END $$;

-- RLS, privileged functions, ownership invariants, and Storage.
DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
  bucket_name text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN (
      'stores','store_coupons','store_reviews','auth_rate_limits','listings','leads',
      'company_members','company_invitations','crm_activities',
      'inventory_locations','inventory_movements'
    )
      AND NOT c.relrowsecurity
  ) THEN missing := array_append(missing, 'RLS on one or more launch tables'); END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='store_reviews' AND policyname='store_reviews_verified_buyer_insert') THEN missing := array_append(missing, 'store review verified buyer policy'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stores' AND policyname='stores_public_read_published') THEN missing := array_append(missing, 'stores public read policy'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='company_members' AND policyname='company_members_workspace_read') THEN missing := array_append(missing, 'company members read policy'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='company_members' AND policyname='company_members_admin_insert') THEN missing := array_append(missing, 'company members insert policy'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='company_invitations' AND policyname='company_invitations_admin_insert') THEN missing := array_append(missing, 'company invitation insert policy'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='leads' AND policyname='leads_company_members_read') THEN missing := array_append(missing, 'CRM leads member policy'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_activities' AND policyname='crm_activities_company_insert') THEN missing := array_append(missing, 'CRM activity insert policy'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='inventory_locations' AND policyname='inventory_locations_company_manage') THEN missing := array_append(missing, 'inventory locations manage policy'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='inventory_movements' AND policyname='inventory_movements_company_insert') THEN missing := array_append(missing, 'inventory movements insert policy'); END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.role_routine_grants
    WHERE specific_schema = 'public'
      AND grantee = 'PUBLIC'
      AND privilege_type = 'EXECUTE'
      AND routine_name IN (
        'consume_auth_rate_limit',
        'recompute_store_coupon_used_count',
        'protect_store_review_fields',
        'is_company_member',
        'has_company_permission',
        'adjust_company_inventory',
        'accept_company_invitation',
        'has_permission',
        'has_role',
        'handle_new_user',
        'enforce_company_member_owner_role',
        'enforce_listing_owner',
        'create_order_atomic',
        'accept_quotation_atomic',
        'record_released_order_inventory'
      )
  ) THEN
    missing := array_append(missing, 'PUBLIC execute on a sensitive launch function');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'consume_auth_rate_limit',
        'recompute_store_coupon_used_count',
        'protect_store_review_fields',
        'is_company_member',
        'has_company_permission',
        'adjust_company_inventory',
        'accept_company_invitation',
        'has_permission',
        'has_role',
        'handle_new_user',
        'enforce_company_member_owner_role',
        'enforce_listing_owner',
        'create_order_atomic',
        'accept_quotation_atomic',
        'record_released_order_inventory'
      )
      AND p.prosecdef
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS setting
        WHERE setting LIKE 'search_path=%'
      )
  ) THEN
    missing := array_append(missing, 'SECURITY DEFINER function without fixed search_path');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.listings listing
    JOIN public.companies company ON company.id = listing.company_id
    WHERE listing.owner_id IS DISTINCT FROM company.owner_id
  ) THEN
    missing := array_append(missing, 'listing ownership drift');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.listings listing
    JOIN public.companies company ON company.id = listing.company_id
    JOIN public.stores store ON store.id = listing.store_id
    WHERE listing.store_id IS NOT NULL
      AND (
        store.company_id IS DISTINCT FROM listing.company_id
        OR store.owner_id IS DISTINCT FROM company.owner_id
      )
  ) THEN
    missing := array_append(missing, 'listing store tenant drift');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.listings listing
    JOIN public.store_categories category ON category.id = listing.store_category_id
    WHERE listing.store_category_id IS NOT NULL
      AND (
        listing.store_id IS NULL
        OR category.store_id IS DISTINCT FROM listing.store_id
      )
  ) THEN
    missing := array_append(missing, 'listing store category drift');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.company_members member
    JOIN public.companies company ON company.id = member.company_id
    WHERE member.role = 'owner'
      AND member.user_id IS DISTINCT FROM company.owner_id
  ) THEN
    missing := array_append(missing, 'company workspace owner drift');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.crm_activities activity
    LEFT JOIN public.leads lead ON lead.id = activity.lead_id
    WHERE lead.id IS NULL
      OR lead.company_id IS DISTINCT FROM activity.company_id
  ) THEN
    missing := array_append(missing, 'CRM activity tenant drift');
  END IF;

  IF has_table_privilege('anon', 'public.leads', 'INSERT')
     OR has_table_privilege('authenticated', 'public.leads', 'INSERT') THEN
    missing := array_append(missing, 'direct Data API lead insert privilege');
  END IF;

  IF has_table_privilege('authenticated', 'public.wholesale_orders', 'INSERT') THEN
    missing := array_append(missing, 'direct Data API order insert privilege');
  END IF;

  IF has_table_privilege('authenticated', 'public.store_coupon_usage', 'INSERT') THEN
    missing := array_append(missing, 'direct Data API coupon usage insert privilege');
  END IF;

  IF NOT has_function_privilege(
    'authenticated',
    'public.create_order_atomic(uuid,uuid,integer,text,text,jsonb,numeric,integer,integer,uuid,text,text,uuid)',
    'EXECUTE'
  ) THEN
    missing := array_append(missing, 'authenticated checkout RPC execute privilege');
  END IF;

  IF NOT has_function_privilege(
    'authenticated',
    'public.accept_quotation_atomic(uuid,jsonb)',
    'EXECUTE'
  ) THEN
    missing := array_append(missing, 'authenticated quotation RPC execute privilege');
  END IF;

  IF pg_get_functiondef('public.handle_new_user()'::regprocedure)
       ~* 'raw_user_meta_data.*role.*::public[.]app_role'
     AND pg_get_functiondef('public.handle_new_user()'::regprocedure)
       !~* 'WHEN ''company''.*WHEN ''agent''.*WHEN ''customer''' THEN
    missing := array_append(missing, 'unsafe public signup role mapping');
  END IF;

  FOREACH bucket_name IN ARRAY ARRAY[
    'company-assets',
    'avatars',
    'listing-media',
    'company-catalogs',
    'rfq-attachments'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM storage.buckets WHERE id = bucket_name
    ) THEN
      missing := array_append(missing, 'storage bucket ' || bucket_name);
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND cmd = 'SELECT'
        AND (
          COALESCE(qual, '') ILIKE '%' || bucket_name || '%'
          OR COALESCE(with_check, '') ILIKE '%' || bucket_name || '%'
        )
    ) THEN
      missing := array_append(missing, 'storage SELECT policy for ' || bucket_name);
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND cmd = 'INSERT'
        AND COALESCE(with_check, '') ILIKE '%' || bucket_name || '%'
        AND COALESCE(with_check, '') ILIKE '%auth.uid()%'
    ) THEN
      missing := array_append(missing, 'owner-scoped storage INSERT policy for ' || bucket_name);
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND cmd = 'UPDATE'
        AND COALESCE(qual, '') ILIKE '%' || bucket_name || '%'
        AND COALESCE(qual, '') ILIKE '%auth.uid()%'
        AND COALESCE(with_check, '') ILIKE '%' || bucket_name || '%'
        AND COALESCE(with_check, '') ILIKE '%auth.uid()%'
    ) THEN
      missing := array_append(missing, 'owner-scoped storage UPDATE policy for ' || bucket_name);
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND cmd = 'DELETE'
        AND COALESCE(qual, '') ILIKE '%' || bucket_name || '%'
        AND COALESCE(qual, '') ILIKE '%auth.uid()%'
    ) THEN
      missing := array_append(missing, 'owner-scoped storage DELETE policy for ' || bucket_name);
    END IF;
  END LOOP;

  IF cardinality(missing) > 0 THEN RAISE EXCEPTION 'Security verification failed: %', array_to_string(missing, ', '); END IF;
END $$;

-- Human-readable result set for the SQL editor.
SELECT 'tables' AS category, count(*)::text AS result FROM information_schema.tables WHERE table_schema='public'
UNION ALL SELECT 'public policies', count(*)::text FROM pg_policies WHERE schemaname='public'
UNION ALL SELECT 'storage policies', count(*)::text FROM pg_policies WHERE schemaname='storage'
UNION ALL SELECT 'launch triggers', count(*)::text FROM pg_trigger WHERE tgname IN ('trg_recompute_store_coupon_used_count','audit_stores','audit_wholesale_orders','trg_protect_store_review_fields','trg_sync_company_owner_membership','trg_enforce_company_member_owner_role','trg_enforce_listing_owner','trg_record_released_order_inventory') AND NOT tgisinternal
UNION ALL SELECT 'verification', 'PASS';
