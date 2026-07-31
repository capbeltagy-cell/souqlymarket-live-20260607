-- Additive only: extend app_role with company workspace roles.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'company_owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'company_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employee';
