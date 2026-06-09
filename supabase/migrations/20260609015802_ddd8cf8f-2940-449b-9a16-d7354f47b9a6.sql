
ALTER TYPE listing_type ADD VALUE IF NOT EXISTS 'company';
ALTER TYPE listing_type ADD VALUE IF NOT EXISTS 'market';
ALTER TYPE listing_type ADD VALUE IF NOT EXISTS 'fish_shed';
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS governorate text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.listings ALTER COLUMN currency SET DEFAULT 'EGP';
ALTER TABLE public.listings ALTER COLUMN country SET DEFAULT 'Egypt';
