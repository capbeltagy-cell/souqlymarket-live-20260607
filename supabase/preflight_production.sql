-- Souqly production preflight (READ-ONLY)
-- Project ref expected by the operator: qujssmtdzmzsfrgtaitj
--
-- This script performs catalog SELECTs only. It does not create, alter, drop,
-- insert, update, delete, grant, revoke, lock, or call application functions.
-- Run it before supabase/launch_bundle.sql and save the complete result.

WITH
required_relations(object_name, requirement) AS (
  VALUES
    ('public.profiles', 'baseline'),
    ('public.user_roles', 'baseline'),
    ('public.companies', 'baseline'),
    ('public.stores', 'baseline'),
    ('public.listings', 'baseline'),
    ('public.leads', 'baseline'),
    ('public.crm_activities', 'baseline'),
    ('public.inventory_movements', 'baseline'),
    ('public.wholesale_orders', 'baseline'),
    ('public.store_coupons', 'baseline'),
    ('public.store_coupon_usage', 'baseline'),
    ('public.store_reviews', 'baseline'),
    ('public.payment_methods', 'baseline'),
    ('public.payment_proofs', 'baseline'),
    ('public.subscriptions', 'baseline'),
    ('public.notifications', 'baseline'),
    ('public.audit_logs', 'baseline'),
    ('public.conversations', 'implicit launch dependency'),
    ('public.referrals', 'implicit launch dependency'),
    ('public.quotations', 'implicit launch dependency'),
    ('public.quotation_items', 'implicit launch dependency'),
    ('public.platform_settings', 'implicit launch dependency'),
    ('public.payout_requests', 'implicit launch dependency'),
    ('public.payout_methods', 'implicit launch dependency'),
    ('public.wallets', 'implicit launch dependency'),
    ('public.wallet_transactions', 'implicit launch dependency'),
    ('public.role_permissions', 'implicit launch dependency'),
    ('public.rfqs', 'implicit launch dependency'),
    ('public.store_categories', 'implicit launch dependency'),
    ('storage.objects', 'Supabase Storage dependency'),
    ('storage.buckets', 'Supabase Storage dependency')
),
required_columns(schema_name, table_name, column_name, expected_type, requirement) AS (
  VALUES
    ('public','companies','id','uuid','company identity'),
    ('public','companies','owner_id','uuid','tenant ownership'),
    ('public','companies','subscription_plan','subscription_plan','subscription activation'),
    ('public','companies','subscription_expires_at','timestamptz','subscription activation'),
    ('public','companies','subscription_updated_at','timestamptz','subscription activation'),

    ('public','listings','id','uuid','listing identity'),
    ('public','listings','company_id','uuid','tenant ownership'),
    ('public','listings','owner_id','uuid','listing ownership'),
    ('public','listings','store_id','uuid','store journey'),
    ('public','listings','store_category_id','uuid','store categorization'),
    ('public','listings','status','listing_status','publication guard'),
    ('public','listings','price','numeric','server-side checkout'),
    ('public','listings','sale_price','numeric','server-side checkout'),
    ('public','listings','currency','text','server-side checkout'),
    ('public','listings','min_order_quantity','integer','server-side checkout'),
    ('public','listings','visible_in_marketplace','boolean','publication guard'),
    ('public','listings','visible_in_store','boolean','publication guard'),
    ('public','listings','track_inventory','boolean','inventory integrity'),
    ('public','listings','stock_quantity','integer','inventory integrity'),
    ('public','listings','dimensions','jsonb','shipping calculation'),

    ('public','stores','id','uuid','store identity'),
    ('public','stores','company_id','uuid','tenant ownership'),
    ('public','stores','owner_id','uuid','store ownership'),
    ('public','stores','status','text','store approval'),

    ('public','wholesale_orders','id','uuid','order identity'),
    ('public','wholesale_orders','buyer_id','uuid','buyer ownership'),
    ('public','wholesale_orders','listing_id','uuid','legacy order compatibility'),
    ('public','wholesale_orders','product_listing_id','uuid','atomic checkout'),
    ('public','wholesale_orders','store_id','uuid','merchant routing'),
    ('public','wholesale_orders','checkout_session_id','uuid','idempotency'),
    ('public','wholesale_orders','idempotency_key','text','idempotency'),
    ('public','wholesale_orders','payment_status','text','payment state'),
    ('public','wholesale_orders','total_amount','numeric','server-side payment amount'),
    ('public','wholesale_orders','currency','text','server-side payment currency'),
    ('public','wholesale_orders','inventory_reserved_at','timestamptz','inventory integrity'),
    ('public','wholesale_orders','inventory_released_at','timestamptz','inventory integrity'),

    ('public','store_reviews','order_id','uuid','verified-purchase reviews'),
    ('public','store_coupon_usage','coupon_id','uuid','coupon accounting'),
    ('public','store_coupon_usage','order_id','uuid','coupon idempotency'),
    ('public','payment_methods','id','uuid','payment method identity'),
    ('public','payment_methods','code','text','manual payment lookup'),
    ('public','payment_methods','is_active','boolean','payment validation'),
    ('public','payment_proofs','order_id','uuid','order payment proof'),
    ('public','payment_proofs','buyer_id','uuid','proof ownership'),
    ('public','payment_proofs','payment_method_id','uuid','payment validation'),
    ('public','payment_proofs','proof_url','text','private proof path'),
    ('public','payment_proofs','amount','numeric','amount validation'),
    ('public','payment_proofs','currency','text','currency validation'),
    ('public','payment_proofs','status','text','review workflow'),

    ('public','subscriptions','id','uuid','subscription identity'),
    ('public','subscriptions','user_id','uuid','subscription ownership'),
    ('public','subscriptions','plan','subscription_plan','subscription plan'),
    ('public','subscriptions','expires_at','timestamptz','subscription expiry'),
    ('public','subscriptions','is_active','boolean','subscription activation'),
    ('public','notifications','user_id','uuid','notification ownership'),

    ('public','quotations','buyer_id','uuid','quotation conversion'),
    ('public','quotations','seller_company_id','uuid','quotation ownership'),
    ('public','quotations','seller_id','uuid','quotation ownership'),
    ('public','quotations','order_id','uuid','idempotent conversion'),
    ('public','quotation_items','quotation_id','uuid','quotation conversion'),
    ('public','quotation_items','listing_id','uuid','quotation conversion'),
    ('public','platform_settings','subscription_plan_price_egp','numeric','server-side pricing'),

    ('public','payout_requests','user_id','uuid','payout ownership'),
    ('public','payout_requests','wallet_id','uuid','payout ledger'),
    ('public','payout_requests','payout_method_id','uuid','payout destination'),
    ('public','payout_requests','status','payout_status','payout workflow'),
    ('public','payout_methods','user_id','uuid','payout destination ownership'),
    ('public','wallets','balance','numeric','payout balance'),
    ('public','wallets','pending_balance','numeric','payout holds'),
    ('public','wallets','total_paid_out','numeric','payout ledger'),

    ('storage','objects','bucket_id','text','Storage RLS'),
    ('storage','objects','name','text','Storage RLS'),
    ('storage','buckets','id','text','bucket identity'),
    ('storage','buckets','public','boolean','private proof storage'),
    ('storage','buckets','file_size_limit','bigint','upload limit'),
    ('storage','buckets','allowed_mime_types','text[]','upload validation')
),
required_functions(object_name, requirement) AS (
  VALUES
    ('public.has_role(uuid,public.app_role)', 'authorization'),
    ('public.log_audit_event()', 'audit triggers'),
    ('public.set_updated_at()', 'updated_at triggers'),
    ('storage.foldername(text)', 'Storage ownership policies')
),
required_types(object_name, requirement) AS (
  VALUES
    ('public.app_role', 'authorization'),
    ('public.subscription_plan', 'subscriptions'),
    ('public.listing_status', 'publication state'),
    ('public.payout_status', 'payout workflow')
),
required_enum_values(type_schema, type_name, enum_value, requirement) AS (
  VALUES
    ('public','app_role','admin','admin authorization'),
    ('public','subscription_plan','premium_company','paid company plan'),
    ('public','listing_status','approved','public listing state'),
    ('public','payout_status','pending','payout workflow'),
    ('public','payout_status','approved','payout workflow'),
    ('public','payout_status','rejected','payout workflow'),
    ('public','payout_status','paid','payout workflow')
),
required_buckets(object_name, expected_public, requirement) AS (
  VALUES
    ('listing-media', NULL::boolean, 'listing media'),
    ('company-assets', NULL::boolean, 'company assets'),
    ('avatars', NULL::boolean, 'profile avatars'),
    ('company-catalogs', NULL::boolean, 'company catalogs'),
    ('rfq-attachments', NULL::boolean, 'RFQ attachments'),
    ('payment-proofs', false, 'private order payment proofs')
),
relation_checks AS (
  SELECT
    'relation'::text AS object_kind,
    object_name,
    requirement,
    CASE WHEN to_regclass(object_name) IS NULL THEN 'FAIL' ELSE 'PASS' END AS status,
    CASE WHEN to_regclass(object_name) IS NULL THEN 'missing relation' ELSE 'present' END AS detail
  FROM required_relations
),
column_checks AS (
  SELECT
    'column'::text,
    format('%I.%I.%I', r.schema_name, r.table_name, r.column_name),
    r.requirement,
    CASE
      WHEN c.column_name IS NULL THEN 'FAIL'
      WHEN c.udt_name = r.expected_type
        OR c.data_type = r.expected_type
        OR (r.expected_type = 'timestamptz' AND c.udt_name = 'timestamptz')
        OR (r.expected_type = 'text[]' AND c.udt_name = '_text')
        OR (r.expected_type = 'integer' AND c.udt_name IN ('int2','int4','int8'))
        THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN c.column_name IS NULL THEN 'missing column'
      ELSE format('actual type=%s (udt=%I.%I), expected=%s',
                  c.data_type, c.udt_schema, c.udt_name, r.expected_type)
    END
  FROM required_columns r
  LEFT JOIN information_schema.columns c
    ON c.table_schema = r.schema_name
   AND c.table_name = r.table_name
   AND c.column_name = r.column_name
),
function_checks AS (
  SELECT
    'function'::text,
    object_name,
    requirement,
    CASE WHEN to_regprocedure(object_name) IS NULL THEN 'FAIL' ELSE 'PASS' END,
    CASE WHEN to_regprocedure(object_name) IS NULL THEN 'missing function/signature' ELSE 'present' END
  FROM required_functions
),
type_checks AS (
  SELECT
    'type'::text,
    object_name,
    requirement,
    CASE WHEN to_regtype(object_name) IS NULL THEN 'FAIL' ELSE 'PASS' END,
    CASE WHEN to_regtype(object_name) IS NULL THEN 'missing type' ELSE 'present' END
  FROM required_types
),
enum_checks AS (
  SELECT
    'enum value'::text,
    format('%I.%I.%s', r.type_schema, r.type_name, r.enum_value),
    r.requirement,
    CASE WHEN e.enumlabel IS NULL THEN 'FAIL' ELSE 'PASS' END,
    CASE WHEN e.enumlabel IS NULL THEN 'missing enum value' ELSE 'present' END
  FROM required_enum_values r
  LEFT JOIN pg_namespace n ON n.nspname = r.type_schema
  LEFT JOIN pg_type t ON t.typnamespace = n.oid AND t.typname = r.type_name
  LEFT JOIN pg_enum e ON e.enumtypid = t.oid AND e.enumlabel = r.enum_value
),
bucket_checks AS (
  SELECT
    'bucket'::text,
    r.object_name,
    r.requirement,
    CASE
      WHEN b.id IS NULL THEN 'FAIL'
      WHEN r.expected_public IS NOT NULL
       AND b.public IS DISTINCT FROM r.expected_public THEN 'FAIL'
      ELSE 'PASS'
    END,
    CASE
      WHEN b.id IS NULL THEN 'missing bucket'
      WHEN r.expected_public IS NOT NULL
       AND b.public IS DISTINCT FROM r.expected_public
        THEN format('public=%s, expected public=%s', b.public, r.expected_public)
      ELSE format('present; public=%s', b.public)
    END
  FROM required_buckets r
  LEFT JOIN storage.buckets b ON b.id = r.object_name
),
all_checks AS (
  SELECT * FROM relation_checks
  UNION ALL SELECT * FROM column_checks
  UNION ALL SELECT * FROM function_checks
  UNION ALL SELECT * FROM type_checks
  UNION ALL SELECT * FROM enum_checks
  UNION ALL SELECT * FROM bucket_checks
)
SELECT object_kind, object_name, requirement, status, detail
FROM all_checks
ORDER BY
  CASE status WHEN 'FAIL' THEN 0 ELSE 1 END,
  object_kind,
  object_name;

-- Independent one-row gate. PASS means the detailed query above found no
-- missing or incompatible prerequisite. It remains read-only.
WITH
required_relations(object_name) AS (
  VALUES
    ('public.profiles'),('public.user_roles'),('public.companies'),
    ('public.stores'),('public.listings'),('public.leads'),
    ('public.crm_activities'),('public.inventory_movements'),
    ('public.wholesale_orders'),('public.store_coupons'),
    ('public.store_coupon_usage'),('public.store_reviews'),
    ('public.payment_methods'),('public.payment_proofs'),
    ('public.subscriptions'),('public.notifications'),('public.audit_logs'),
    ('public.conversations'),('public.referrals'),('public.quotations'),
    ('public.quotation_items'),('public.platform_settings'),
    ('public.payout_requests'),('public.payout_methods'),('public.wallets'),
    ('public.wallet_transactions'),('public.role_permissions'),
    ('public.rfqs'),('public.store_categories'),
    ('storage.objects'),('storage.buckets')
),
required_columns(schema_name, table_name, column_name) AS (
  VALUES
    ('public','wholesale_orders','store_id'),
    ('public','wholesale_orders','product_listing_id'),
    ('public','wholesale_orders','checkout_session_id'),
    ('public','wholesale_orders','payment_status'),
    ('public','wholesale_orders','total_amount'),
    ('public','store_reviews','order_id'),
    ('public','listings','store_category_id'),
    ('public','listings','store_id'),
    ('public','listings','sale_price'),
    ('public','listings','min_order_quantity'),
    ('public','listings','visible_in_marketplace'),
    ('public','listings','visible_in_store'),
    ('public','listings','track_inventory'),
    ('public','listings','stock_quantity'),
    ('public','listings','dimensions'),
    ('public','payment_methods','code'),
    ('public','payment_proofs','order_id'),
    ('public','payout_requests','payout_method_id'),
    ('public','payout_methods','user_id')
),
required_functions(signature) AS (
  VALUES
    ('public.has_role(uuid,public.app_role)'),
    ('public.log_audit_event()'),
    ('public.set_updated_at()'),
    ('storage.foldername(text)')
),
required_types(object_name) AS (
  VALUES
    ('public.app_role'),('public.subscription_plan'),
    ('public.listing_status'),('public.payout_status')
),
failures AS (
  SELECT object_name FROM required_relations WHERE to_regclass(object_name) IS NULL
  UNION ALL
  SELECT format('%I.%I.%I', r.schema_name, r.table_name, r.column_name)
  FROM required_columns r
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema=r.schema_name
      AND c.table_name=r.table_name
      AND c.column_name=r.column_name
  )
  UNION ALL
  SELECT signature FROM required_functions WHERE to_regprocedure(signature) IS NULL
  UNION ALL
  SELECT object_name FROM required_types WHERE to_regtype(object_name) IS NULL
)
SELECT
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS preflight_status,
  count(*) AS failure_count,
  coalesce(string_agg(object_name, ', ' ORDER BY object_name), 'none') AS failures
FROM failures;
