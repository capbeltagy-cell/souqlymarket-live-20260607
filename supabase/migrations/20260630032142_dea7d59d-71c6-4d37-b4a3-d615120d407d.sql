
-- Phase 1: Roles, Permissions & Audit Foundation

-- 1) Extend app_role enum (safe; values only added)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'factory';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'service_provider';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'wholesaler';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'importer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'exporter';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'distributor';
