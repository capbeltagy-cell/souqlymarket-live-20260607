
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_updated_at timestamptz;
