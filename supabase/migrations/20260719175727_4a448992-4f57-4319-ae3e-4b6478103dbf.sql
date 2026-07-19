
-- 1) Tighten permissive INSERT policy on contact_submissions (was WITH CHECK true)
DROP POLICY IF EXISTS "Anyone can submit contact" ON public.contact_submissions;
CREATE POLICY "Anyone can submit contact"
  ON public.contact_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(coalesce(message, '')) BETWEEN 1 AND 5000
    AND char_length(coalesce(name, '')) BETWEEN 1 AND 200
    AND char_length(coalesce(email, '')) BETWEEN 3 AND 320
  );

-- 2) Add WITH CHECK to agent_applications UPDATE so company owner cannot re-target the row
DROP POLICY IF EXISTS "Company updates application" ON public.agent_applications;
CREATE POLICY "Company updates application"
  ON public.agent_applications
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = agent_applications.company_id AND c.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = agent_applications.company_id AND c.owner_id = auth.uid()));

-- Trigger to prevent altering immutable fields (agent_id, company_id) by non-admin
CREATE OR REPLACE FUNCTION public.protect_agent_application_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.agent_id := OLD.agent_id;
    NEW.company_id := OLD.company_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS protect_agent_application_fields_trg ON public.agent_applications;
CREATE TRIGGER protect_agent_application_fields_trg
  BEFORE UPDATE ON public.agent_applications
  FOR EACH ROW EXECUTE FUNCTION public.protect_agent_application_fields();

-- 3) Hide agents.user_id from anonymous role via column-level grants
REVOKE SELECT ON public.agents FROM anon;
GRANT SELECT
  (id, is_verified, is_premium, is_trusted, subscription_plan,
   headline_ar, headline_en, bio_ar, bio_en, country, city,
   specialties, languages, created_at, updated_at)
  ON public.agents TO anon;
