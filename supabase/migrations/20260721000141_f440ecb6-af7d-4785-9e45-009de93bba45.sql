
-- Store subscription: 7-day trial + monthly plan
DO $$ BEGIN
  CREATE TYPE public.store_sub_status AS ENUM ('trial','active','past_due','expired','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS subscription_status public.store_sub_status NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_monthly_egp integer NOT NULL DEFAULT 250,
  ADD COLUMN IF NOT EXISTS first_published_at timestamptz;

-- Start trial exactly once, when store first transitions to published
CREATE OR REPLACE FUNCTION public.stores_start_trial_on_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published'
     AND NEW.first_published_at IS NULL THEN
    NEW.first_published_at := now();
    IF NEW.trial_started_at IS NULL THEN
      NEW.trial_started_at := now();
      NEW.trial_ends_at := now() + interval '7 days';
      NEW.subscription_status := 'trial';
      NEW.subscription_current_period_end := now() + interval '7 days';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS stores_start_trial_on_publish ON public.stores;
CREATE TRIGGER stores_start_trial_on_publish
BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.stores_start_trial_on_publish();
