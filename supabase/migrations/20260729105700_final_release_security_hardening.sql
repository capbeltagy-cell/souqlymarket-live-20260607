-- Final release hardening. Additive/convergent and safe for existing data.
BEGIN;

-- Notifications are produced by trusted server functions only. Authenticated
-- users retain access to their own inbox through the existing SELECT/UPDATE RLS.
REVOKE INSERT ON public.notifications FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

DROP POLICY IF EXISTS "Authenticated creates notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service inserts notifications" ON public.notifications;
DROP POLICY IF EXISTS "notif_insert_any" ON public.notifications;

-- Views exposed by the Data API must evaluate the caller's RLS, when present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class AS relation
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname = 'marketplace_stats'
      AND relation.relkind = 'v'
  ) THEN
    EXECUTE 'ALTER VIEW public.marketplace_stats SET (security_invoker = true)';
  END IF;
END
$$;

-- The common timestamp trigger must not inherit a mutable caller search_path.
DO $$
BEGIN
  IF to_regprocedure('public.set_updated_at()') IS NOT NULL THEN
    ALTER FUNCTION public.set_updated_at() SET search_path = '';
  END IF;
END
$$;

COMMIT;
