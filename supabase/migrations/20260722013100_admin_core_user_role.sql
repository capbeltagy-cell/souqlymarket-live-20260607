-- Compatibility role for ordinary authenticated accounts.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';
