DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', r.tablename);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', r.tablename);
  END LOOP;
END $$;

-- Anon read for tables whose RLS policies allow public SELECT
GRANT SELECT ON public.companies TO anon;
GRANT SELECT ON public.listings TO anon;
GRANT SELECT ON public.agents TO anon;
GRANT SELECT ON public.factories TO anon;
GRANT SELECT ON public.tenders TO anon;
GRANT SELECT ON public.rfqs TO anon;
GRANT SELECT ON public.wholesale_listings TO anon;
GRANT SELECT ON public.business_categories TO anon;
GRANT SELECT ON public.company_profiles_extra TO anon;
GRANT SELECT ON public.agent_landing_pages TO anon;

-- Anon insert for lead capture (RLS policy already allows anon INSERT)
GRANT INSERT ON public.leads TO anon;

-- Sequences for any inserts that may use them
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;