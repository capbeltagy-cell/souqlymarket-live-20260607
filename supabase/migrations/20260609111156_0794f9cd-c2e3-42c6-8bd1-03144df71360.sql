
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS property_subtype text,
  ADD COLUMN IF NOT EXISTS area_sqm numeric(12,2),
  ADD COLUMN IF NOT EXISTS bedrooms integer,
  ADD COLUMN IF NOT EXISTS bathrooms integer;

CREATE INDEX IF NOT EXISTS listings_type_subtype_idx ON public.listings(type, property_subtype);
CREATE INDEX IF NOT EXISTS listings_governorate_idx ON public.listings(governorate);
