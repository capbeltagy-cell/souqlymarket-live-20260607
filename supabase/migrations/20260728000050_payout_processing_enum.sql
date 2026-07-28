-- Kept in its own migration because PostgreSQL requires a commit after
-- adding an enum value before that value is used by later DDL/functions.
ALTER TYPE public.payout_status ADD VALUE IF NOT EXISTS 'processing';
