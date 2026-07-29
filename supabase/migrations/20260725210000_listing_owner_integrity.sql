-- Tie every listing, including store products, to its canonical company owner.
-- Additive and non-destructive: existing rows are backfilled from companies.

BEGIN;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT;

UPDATE public.listings AS listing
SET owner_id = company.owner_id
FROM public.companies AS company
WHERE company.id = listing.company_id
  AND listing.owner_id IS DISTINCT FROM company.owner_id;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.listings WHERE owner_id IS NULL) THEN
    RAISE EXCEPTION 'listing_owner_backfill_incomplete';
  END IF;
END
$$;

ALTER TABLE public.listings
  ALTER COLUMN owner_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS listings_owner_created_idx
  ON public.listings(owner_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.enforce_listing_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  canonical_owner uuid;
BEGIN
  SELECT company.owner_id
  INTO canonical_owner
  FROM public.companies AS company
  WHERE company.id = NEW.company_id;

  IF canonical_owner IS NULL THEN
    RAISE EXCEPTION 'listing_company_owner_not_found';
  END IF;

  NEW.owner_id := canonical_owner;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_listing_owner() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_enforce_listing_owner ON public.listings;
CREATE TRIGGER trg_enforce_listing_owner
BEFORE INSERT OR UPDATE OF company_id, owner_id ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_listing_owner();

COMMIT;
