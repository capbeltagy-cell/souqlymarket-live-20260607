-- Add governorate and GPS fields to listings and add new listing types for Market and Fish Shed
ALTER TYPE public.listing_type ADD VALUE IF NOT EXISTS 'market';
ALTER TYPE public.listing_type ADD VALUE IF NOT EXISTS 'fish_shed';

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS governorate TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC;
