-- Fix "Listing Not Found" root cause:
-- Public listing pages join listings -> companies. The anon role had no SELECT
-- grant on listings and neither anon nor authenticated had SELECT on companies,
-- so PostgREST returned "permission denied" and the detail page fell back to
-- the not-found view. RLS policies on both tables already scope access
-- correctly (approved listings visible to all; owners/admins see the rest;
-- companies are public-read).

GRANT SELECT ON public.listings TO anon;
GRANT SELECT ON public.companies TO anon, authenticated;