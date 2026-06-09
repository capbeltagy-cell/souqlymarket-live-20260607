
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS image_sources TEXT[] NOT NULL DEFAULT '{}'::text[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'listing_status' AND e.enumlabel = 'pending_review'
  ) THEN
    ALTER TYPE public.listing_status ADD VALUE 'pending_review';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS listings_dup_idx
  ON public.listings (phone, governorate, lower(title_ar));
