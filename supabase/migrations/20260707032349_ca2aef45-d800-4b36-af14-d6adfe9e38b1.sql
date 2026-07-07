
-- Provenance/launch content fields
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS import_batch_id uuid,
  ADD COLUMN IF NOT EXISTS imported_by uuid,
  ADD COLUMN IF NOT EXISTS is_launch_content boolean NOT NULL DEFAULT false;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS import_batch_id uuid,
  ADD COLUMN IF NOT EXISTS imported_by uuid,
  ADD COLUMN IF NOT EXISTS is_launch_content boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

ALTER TABLE public.factories
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS import_batch_id uuid,
  ADD COLUMN IF NOT EXISTS imported_by uuid,
  ADD COLUMN IF NOT EXISTS is_launch_content boolean NOT NULL DEFAULT false;

ALTER TABLE public.rfqs
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS import_batch_id uuid,
  ADD COLUMN IF NOT EXISTS imported_by uuid,
  ADD COLUMN IF NOT EXISTS is_launch_content boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS listings_import_batch_idx ON public.listings(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS companies_import_batch_idx ON public.companies(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS factories_import_batch_idx ON public.factories(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS rfqs_import_batch_idx ON public.rfqs(import_batch_id) WHERE import_batch_id IS NOT NULL;

-- Track batches for admin management
CREATE TABLE IF NOT EXISTS public.launch_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  source_name text,
  notes text,
  item_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.launch_import_batches TO authenticated;
GRANT ALL ON public.launch_import_batches TO service_role;
ALTER TABLE public.launch_import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage batches" ON public.launch_import_batches
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Allow the protect_listing_privileged_insert/update triggers to preserve is_launch_content for admins (no change needed; admins bypass).
