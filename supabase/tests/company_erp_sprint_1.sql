-- Run after the Sprint 1 migrations on a disposable/local Supabase database.
-- Read-only catalog assertions: the test never changes application data.

DO $$
DECLARE
  missing text[];
BEGIN
  SELECT array_agg(required_name)
  INTO missing
  FROM unnest(ARRAY[
    'company_members', 'company_invitations', 'crm_activities',
    'inventory_locations', 'inventory_movements'
  ]) AS required_name
  WHERE to_regclass('public.' || required_name) IS NULL;

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing ERP tables: %', array_to_string(missing, ', ');
  END IF;

  IF to_regprocedure('public.is_company_member(uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Missing function public.is_company_member(uuid,uuid)';
  END IF;
  IF to_regprocedure('public.has_company_permission(uuid,text,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Missing function public.has_company_permission(uuid,text,uuid)';
  END IF;
  IF to_regprocedure('public.adjust_company_inventory(uuid,integer,text,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Missing function public.adjust_company_inventory(uuid,integer,text,uuid)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
      'company_members', 'company_invitations', 'crm_activities',
      'inventory_locations', 'inventory_movements'
    ]) AS table_name
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = table_name AND c.relrowsecurity
    )
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on every ERP Sprint 1 table';
  END IF;

  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'public'
      AND tablename IN (
        'company_members', 'company_invitations', 'crm_activities',
        'inventory_locations', 'inventory_movements'
      )) < 10 THEN
    RAISE EXCEPTION 'Expected ERP RLS policies were not installed';
  END IF;

  RAISE NOTICE 'Souqly ERP Sprint 1 schema verification passed.';
END $$;
