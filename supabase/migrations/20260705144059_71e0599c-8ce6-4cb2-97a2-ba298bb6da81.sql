-- Restrict public exposure of company contact fields (email, phone, website).
-- Row-level SELECT stays permissive so the marketplace still lists companies,
-- but the sensitive contact columns are no longer readable through the Data API
-- for anon or authenticated roles. Owner + admin read paths go through
-- server functions that use the service role.
REVOKE SELECT (email, phone, website) ON public.companies FROM anon;
REVOKE SELECT (email, phone, website) ON public.companies FROM authenticated;
-- service_role retains ALL privileges (default) and can read contact fields.
