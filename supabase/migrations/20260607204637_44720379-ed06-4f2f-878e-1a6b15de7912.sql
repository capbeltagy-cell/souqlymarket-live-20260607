
-- 1. Listings: featured expiry + counters
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS featured_until timestamptz,
  ADD COLUMN IF NOT EXISTS clicks_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leads_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS listings_featured_until_idx
  ON public.listings (featured_until DESC NULLS LAST);

-- 2. Leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  buyer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name text NOT NULL,
  buyer_email text,
  buyer_phone text,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leads_status_chk CHECK (status IN ('new','contacted','won','lost'))
);

CREATE INDEX IF NOT EXISTS leads_company_id_idx ON public.leads (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_listing_id_idx ON public.leads (listing_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT INSERT ON public.leads TO anon;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a lead"
  ON public.leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Company owner views own leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = leads.company_id AND c.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Company owner updates own leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = leads.company_id AND c.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Company owner deletes own leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = leads.company_id AND c.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER trg_leads_updated
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- bump listings.leads_count on insert
CREATE OR REPLACE FUNCTION public.bump_listing_leads_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.listings SET leads_count = leads_count + 1 WHERE id = NEW.listing_id;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.bump_listing_leads_count() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_leads_bump_count
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.bump_listing_leads_count();

-- 3. Payments table (future online payments scaffolding)
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  purpose text NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EGP',
  status text NOT NULL DEFAULT 'pending',
  provider text,
  provider_reference text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_purpose_chk CHECK (purpose IN ('subscription','featured_listing','other')),
  CONSTRAINT payments_status_chk CHECK (status IN ('pending','paid','failed','refunded'))
);

CREATE INDEX IF NOT EXISTS payments_user_idx ON public.payments (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage payments"
  ON public.payments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_payments_updated
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. Counter RPCs
CREATE OR REPLACE FUNCTION public.increment_listing_view(_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.listings SET views_count = views_count + 1 WHERE id = _id;
$$;
REVOKE EXECUTE ON FUNCTION public.increment_listing_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_listing_view(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_listing_click(_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.listings SET clicks_count = clicks_count + 1 WHERE id = _id;
$$;
REVOKE EXECUTE ON FUNCTION public.increment_listing_click(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_listing_click(uuid) TO anon, authenticated;
