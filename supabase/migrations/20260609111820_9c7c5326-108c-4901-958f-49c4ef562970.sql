ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS ownership_type text,
  ADD COLUMN IF NOT EXISTS address_line text;

CREATE INDEX IF NOT EXISTS listings_purpose_idx ON public.listings(purpose);