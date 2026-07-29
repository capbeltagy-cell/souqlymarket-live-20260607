-- Souqly production launch bundle
-- Scope: post-baseline launch hardening only. This file never drops tables or data.
-- Safe to rerun: tables/indexes use IF NOT EXISTS; functions are replaced; convergent
-- policies/triggers are dropped and recreated because PostgreSQL has no CREATE OR REPLACE
-- for these object types.

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
SELECT pg_advisory_xact_lock(hashtext('souqly_launch_bundle_v1'));

-- ---------------------------------------------------------------------------
-- 0. Baseline dependency guard — fail before changing anything.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
  relation_name text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY[
    'public.stores', 'public.listings', 'public.wholesale_orders',
    'public.store_coupons', 'public.store_coupon_usage', 'public.store_reviews'
  ] LOOP
    IF to_regclass(relation_name) IS NULL THEN
      missing := array_append(missing, relation_name);
    END IF;
  END LOOP;

  IF to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL THEN
    missing := array_append(missing, 'public.has_role(uuid, app_role)');
  END IF;
  IF to_regprocedure('public.log_audit_event()') IS NULL THEN
    missing := array_append(missing, 'public.log_audit_event()');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='wholesale_orders' AND column_name='store_id') THEN
    missing := array_append(missing, 'public.wholesale_orders.store_id');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_reviews' AND column_name='order_id') THEN
    missing := array_append(missing, 'public.store_reviews.order_id');
  END IF;

  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'Souqly baseline is incomplete. Missing: %', array_to_string(missing, ', ');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Store/order integrity and query indexes.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS wholesale_orders_store_created_idx
  ON public.wholesale_orders (store_id, created_at DESC)
  WHERE store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS listings_store_status_idx
  ON public.listings (store_id, status, created_at DESC)
  WHERE store_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS store_coupon_usage_order_uidx
  ON public.store_coupon_usage (coupon_id, order_id)
  WHERE order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.recompute_store_coupon_used_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon_id uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.coupon_id ELSE NEW.coupon_id END;
BEGIN
  UPDATE public.store_coupons
     SET used_count = (
       SELECT count(*)::integer
         FROM public.store_coupon_usage
        WHERE coupon_id = v_coupon_id
     )
   WHERE id = v_coupon_id;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_store_coupon_used_count() FROM PUBLIC;

-- Trigger replacement is metadata-only and does not remove table data.
DROP TRIGGER IF EXISTS trg_recompute_store_coupon_used_count ON public.store_coupon_usage;
CREATE TRIGGER trg_recompute_store_coupon_used_count
AFTER INSERT OR DELETE ON public.store_coupon_usage
FOR EACH ROW EXECUTE FUNCTION public.recompute_store_coupon_used_count();

DROP TRIGGER IF EXISTS audit_stores ON public.stores;
CREATE TRIGGER audit_stores
AFTER INSERT OR UPDATE OR DELETE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_wholesale_orders ON public.wholesale_orders;
CREATE TRIGGER audit_wholesale_orders
AFTER INSERT OR UPDATE OR DELETE ON public.wholesale_orders
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ---------------------------------------------------------------------------
-- 2. Database-backed authenticated rate limiting.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  user_id uuid NOT NULL,
  action text NOT NULL,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (user_id, action)
);

REVOKE ALL ON public.auth_rate_limits FROM anon, authenticated;
GRANT ALL ON public.auth_rate_limits TO service_role;
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_auth_rate_limit(
  p_action text,
  p_max_requests integer,
  p_window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row public.auth_rate_limits%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RETURN false; END IF;
  IF p_action IS NULL OR length(p_action) > 80 OR p_max_requests < 1
     OR p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'Invalid rate limit parameters';
  END IF;

  INSERT INTO public.auth_rate_limits (user_id, action, request_count)
  VALUES (v_user_id, p_action, 0)
  ON CONFLICT (user_id, action) DO NOTHING;

  SELECT * INTO v_row
    FROM public.auth_rate_limits
   WHERE user_id = v_user_id AND action = p_action
   FOR UPDATE;

  IF v_row.window_started_at <= now() - make_interval(secs => p_window_seconds) THEN
    UPDATE public.auth_rate_limits
       SET window_started_at = now(), request_count = 1
     WHERE user_id = v_user_id AND action = p_action;
    RETURN true;
  END IF;
  IF v_row.request_count >= p_max_requests THEN RETURN false; END IF;

  UPDATE public.auth_rate_limits
     SET request_count = request_count + 1
   WHERE user_id = v_user_id AND action = p_action;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_auth_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_auth_rate_limit(text, integer, integer) TO authenticated;

CREATE INDEX IF NOT EXISTS auth_rate_limits_window_idx
  ON public.auth_rate_limits (window_started_at);

-- ---------------------------------------------------------------------------
-- 3. Verified-purchase store reviews and immutable review ownership fields.
-- ---------------------------------------------------------------------------
-- Policy replacement is required to converge an existing installation safely.
DROP POLICY IF EXISTS "store_reviews_author_insert" ON public.store_reviews;
DROP POLICY IF EXISTS "store_reviews_verified_buyer_insert" ON public.store_reviews;
CREATE POLICY "store_reviews_verified_buyer_insert" ON public.store_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND order_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.wholesale_orders o
       WHERE o.id = order_id
         AND o.store_id = store_id
         AND o.buyer_id = auth.uid()
         AND o.status IN ('delivered', 'completed')
    )
  );

CREATE OR REPLACE FUNCTION public.protect_store_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := public.has_role(auth.uid(), 'admin');
  v_is_store_owner boolean;
BEGIN
  IF v_is_admin THEN RETURN NEW; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.stores s
     WHERE s.id = OLD.store_id AND s.owner_id = auth.uid()
  ) INTO v_is_store_owner;

  IF v_is_store_owner THEN
    NEW.store_id := OLD.store_id; NEW.user_id := OLD.user_id; NEW.order_id := OLD.order_id;
    NEW.rating := OLD.rating; NEW.body := OLD.body; NEW.status := OLD.status;
    RETURN NEW;
  END IF;

  IF OLD.user_id = auth.uid() THEN
    NEW.store_id := OLD.store_id; NEW.user_id := OLD.user_id; NEW.order_id := OLD.order_id;
    NEW.seller_reply := OLD.seller_reply; NEW.status := OLD.status;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not allowed to update this review';
END;
$$;

REVOKE ALL ON FUNCTION public.protect_store_review_fields() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_protect_store_review_fields ON public.store_reviews;
CREATE TRIGGER trg_protect_store_review_fields
BEFORE UPDATE ON public.store_reviews
FOR EACH ROW EXECUTE FUNCTION public.protect_store_review_fields();

-- BEGIN GENERATED RELEASE DELTAS
-- Generated by scripts/build-launch-bundle.mjs. Do not edit this section manually.

-- Source: supabase/migrations/20260723105000_company_workspace_dependencies.sql
-- Company workspace prerequisites used by the tenant, CRM and checkout hardening.
-- Convergent and additive: keeps legacy CRM/inventory rows and extends their schema.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$ BEGIN
  CREATE TYPE public.company_member_role AS ENUM(
    'owner','admin','sales','inventory','accountant','marketing','viewer'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.company_member_role NOT NULL DEFAULT 'viewer',
  permissions text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.company_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin','sales','inventory','accountant','marketing','viewer')),
  permissions text[] NOT NULL DEFAULT ARRAY[]::text[],
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','revoked','expired')),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_members_user_idx
  ON public.company_members(user_id) WHERE status='active';
CREATE INDEX IF NOT EXISTS company_members_company_idx
  ON public.company_members(company_id,status);
CREATE UNIQUE INDEX IF NOT EXISTS company_invitations_pending_email_idx
  ON public.company_invitations(company_id,lower(email)) WHERE status='pending';

ALTER TABLE public.company_members
  ADD COLUMN IF NOT EXISTS permissions text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS joined_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.is_company_member(
  _company_id uuid,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id=_company_id AND c.owner_id=_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.company_members m
    WHERE m.company_id=_company_id AND m.user_id=_user_id AND m.status='active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_company_permission(
  _company_id uuid,
  _permission text,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id=_company_id AND c.owner_id=_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.company_members m
    WHERE m.company_id=_company_id
      AND m.user_id=_user_id
      AND m.status='active'
      AND (
        m.role IN ('owner','admin')
        OR '*'=ANY(m.permissions)
        OR _permission=ANY(m.permissions)
        OR (m.role='sales' AND _permission=ANY(ARRAY[
          'workspace.view','crm.view','crm.manage'
        ]))
        OR (m.role='inventory' AND _permission=ANY(ARRAY[
          'workspace.view','inventory.view','inventory.manage'
        ]))
        OR (m.role='accountant' AND _permission=ANY(ARRAY[
          'workspace.view','inventory.view'
        ]))
        OR (m.role='marketing' AND _permission=ANY(ARRAY[
          'workspace.view','crm.view'
        ]))
        OR (m.role='viewer' AND _permission=ANY(ARRAY[
          'workspace.view','crm.view','inventory.view','members.view'
        ]))
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_company_member(uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.has_company_permission(uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_company_member(uuid,uuid)
  TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.has_company_permission(uuid,text,uuid)
  TO authenticated,service_role;

INSERT INTO public.company_members(company_id,user_id,role,permissions,status)
SELECT id,owner_id,'owner',ARRAY[]::text[],'active'
FROM public.companies WHERE owner_id IS NOT NULL
ON CONFLICT (company_id,user_id) DO UPDATE
SET role='owner',status='active',updated_at=now();

CREATE OR REPLACE FUNCTION public.sync_company_owner_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.company_members(company_id,user_id,role,permissions,status)
    VALUES(NEW.id,NEW.owner_id,'owner',ARRAY[]::text[],'active')
    ON CONFLICT(company_id,user_id) DO UPDATE
      SET role='owner',status='active',updated_at=now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_company_owner_membership()
  FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_sync_company_owner_membership ON public.companies;
CREATE TRIGGER trg_sync_company_owner_membership
AFTER INSERT OR UPDATE OF owner_id ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.sync_company_owner_membership();

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_members_workspace_read" ON public.company_members;
CREATE POLICY "company_members_workspace_read" ON public.company_members
FOR SELECT TO authenticated
USING(public.is_company_member(company_id,auth.uid()));
DROP POLICY IF EXISTS "company_members_admin_insert" ON public.company_members;
CREATE POLICY "company_members_admin_insert" ON public.company_members
FOR INSERT TO authenticated
WITH CHECK(role<>'owner' AND public.has_company_permission(company_id,'members.manage',auth.uid()));
DROP POLICY IF EXISTS "company_members_admin_update" ON public.company_members;
CREATE POLICY "company_members_admin_update" ON public.company_members
FOR UPDATE TO authenticated
USING(role<>'owner' AND public.has_company_permission(company_id,'members.manage',auth.uid()))
WITH CHECK(role<>'owner' AND public.has_company_permission(company_id,'members.manage',auth.uid()));
DROP POLICY IF EXISTS "company_members_admin_delete" ON public.company_members;
CREATE POLICY "company_members_admin_delete" ON public.company_members
FOR DELETE TO authenticated
USING(role<>'owner' AND public.has_company_permission(company_id,'members.manage',auth.uid()));
DROP POLICY IF EXISTS "company_invitations_workspace_read" ON public.company_invitations;
CREATE POLICY "company_invitations_workspace_read" ON public.company_invitations
FOR SELECT TO authenticated
USING(public.has_company_permission(company_id,'members.view',auth.uid()));
DROP POLICY IF EXISTS "company_invitations_admin_insert" ON public.company_invitations;
CREATE POLICY "company_invitations_admin_insert" ON public.company_invitations
FOR INSERT TO authenticated
WITH CHECK(invited_by=auth.uid() AND public.has_company_permission(company_id,'members.manage',auth.uid()));
DROP POLICY IF EXISTS "company_invitations_admin_update" ON public.company_invitations;
CREATE POLICY "company_invitations_admin_update" ON public.company_invitations
FOR UPDATE TO authenticated
USING(public.has_company_permission(company_id,'members.manage',auth.uid()))
WITH CHECK(public.has_company_permission(company_id,'members.manage',auth.uid()));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.company_members TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.company_invitations TO authenticated;
GRANT ALL ON public.company_members,public.company_invitations TO service_role;

-- Extend the older business-suite tables without replacing or deleting rows.
ALTER TABLE public.crm_activities
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS occurred_at timestamptz NOT NULL DEFAULT now();
UPDATE public.crm_activities
SET actor_id=created_by, occurred_at=created_at
WHERE actor_id IS NULL;
ALTER TABLE public.crm_activities
  DROP CONSTRAINT IF EXISTS crm_activities_activity_type_check;
ALTER TABLE public.crm_activities
  ADD CONSTRAINT crm_activities_activity_type_check CHECK(
    activity_type IN ('call','message','meeting','note','task','email','status_change')
  );

CREATE TABLE IF NOT EXISTS public.inventory_locations(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  address text,
  is_default boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id,name)
);
CREATE UNIQUE INDEX IF NOT EXISTS inventory_locations_default_idx
  ON public.inventory_locations(company_id) WHERE is_default AND active;

ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES public.listings(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantity_delta integer,
  ADD COLUMN IF NOT EXISTS balance_after integer CHECK(balance_after>=0);
ALTER TABLE public.inventory_movements ALTER COLUMN item_id DROP NOT NULL;
ALTER TABLE public.inventory_movements ALTER COLUMN quantity DROP NOT NULL;
ALTER TABLE public.inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_movement_type_check;
ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_movement_type_check CHECK(
    movement_type IN (
      'opening','purchase','sale','return','adjustment','adjustment_in',
      'adjustment_out','transfer_in','transfer_out'
    )
  );

CREATE INDEX IF NOT EXISTS crm_activities_lead_idx
  ON public.crm_activities(lead_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS inventory_movements_listing_idx
  ON public.inventory_movements(listing_id,created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_movements_company_idx
  ON public.inventory_movements(company_id,created_at DESC);

ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company manages inventory movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "inventory_locations_company_read" ON public.inventory_locations;
CREATE POLICY "inventory_locations_company_read" ON public.inventory_locations
FOR SELECT TO authenticated
USING(public.has_company_permission(company_id,'inventory.view',auth.uid()));
DROP POLICY IF EXISTS "inventory_locations_company_manage" ON public.inventory_locations;
CREATE POLICY "inventory_locations_company_manage" ON public.inventory_locations
FOR ALL TO authenticated
USING(public.has_company_permission(company_id,'inventory.manage',auth.uid()))
WITH CHECK(created_by=auth.uid() AND public.has_company_permission(company_id,'inventory.manage',auth.uid()));
DROP POLICY IF EXISTS "inventory_movements_company_read" ON public.inventory_movements;
CREATE POLICY "inventory_movements_company_read" ON public.inventory_movements
FOR SELECT TO authenticated
USING(public.has_company_permission(company_id,'inventory.view',auth.uid()));
REVOKE INSERT,UPDATE,DELETE ON public.inventory_movements FROM authenticated;
GRANT SELECT ON public.inventory_movements TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.inventory_locations TO authenticated;

CREATE OR REPLACE FUNCTION public.adjust_company_inventory(
  _listing_id uuid,
  _quantity_delta integer,
  _note text DEFAULT NULL,
  _location_id uuid DEFAULT NULL
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  company_key uuid;
  current_balance integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  IF _quantity_delta=0 THEN RAISE EXCEPTION 'quantity_delta_must_not_be_zero'; END IF;
  SELECT company_id,COALESCE(stock_quantity,0)
    INTO company_key,current_balance
    FROM public.listings
   WHERE id=_listing_id AND type='product'
   FOR UPDATE;
  IF company_key IS NULL THEN RAISE EXCEPTION 'product_not_found'; END IF;
  IF NOT public.has_company_permission(company_key,'inventory.manage',auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_company_permission';
  END IF;
  IF _location_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM public.inventory_locations
    WHERE id=_location_id AND company_id=company_key AND active
  ) THEN RAISE EXCEPTION 'invalid_inventory_location'; END IF;
  current_balance:=current_balance+_quantity_delta;
  IF current_balance<0 THEN RAISE EXCEPTION 'insufficient_inventory'; END IF;
  UPDATE public.listings
  SET stock_quantity=current_balance,track_inventory=true,updated_at=now()
  WHERE id=_listing_id;
  INSERT INTO public.inventory_movements(
    company_id,listing_id,location_id,movement_type,quantity_delta,
    balance_after,note,created_by
  ) VALUES(
    company_key,_listing_id,_location_id,'adjustment',_quantity_delta,
    current_balance,NULLIF(trim(_note),''),auth.uid()
  );
  RETURN current_balance;
END;
$$;
REVOKE ALL ON FUNCTION public.adjust_company_inventory(uuid,integer,text,uuid)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.adjust_company_inventory(uuid,integer,text,uuid)
  TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.accept_company_invitation(_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  invitation public.company_invitations%ROWTYPE;
  signed_email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  signed_email:=lower(COALESCE(auth.jwt()->>'email',''));
  IF signed_email='' THEN RAISE EXCEPTION 'verified_email_required'; END IF;
  SELECT * INTO invitation FROM public.company_invitations
  WHERE token_hash=encode(extensions.digest(_token,'sha256'),'hex')
    AND status='pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invitation_not_found'; END IF;
  IF invitation.expires_at<=now() THEN
    UPDATE public.company_invitations SET status='expired',updated_at=now()
    WHERE id=invitation.id;
    RAISE EXCEPTION 'invitation_expired';
  END IF;
  IF lower(invitation.email)<>signed_email THEN
    RAISE EXCEPTION 'invitation_email_mismatch';
  END IF;
  INSERT INTO public.company_members(
    company_id,user_id,role,permissions,status,invited_by
  ) VALUES(
    invitation.company_id,auth.uid(),invitation.role::public.company_member_role,invitation.permissions,
    'active',invitation.invited_by
  )
  ON CONFLICT(company_id,user_id) DO UPDATE
  SET role=CASE WHEN company_members.role='owner' THEN 'owner' ELSE EXCLUDED.role END,
      permissions=CASE WHEN company_members.role='owner'
        THEN company_members.permissions ELSE EXCLUDED.permissions END,
      status='active',updated_at=now();
  UPDATE public.company_invitations
  SET status='accepted',accepted_at=now(),updated_at=now()
  WHERE id=invitation.id;
  RETURN invitation.company_id;
END;
$$;
REVOKE ALL ON FUNCTION public.accept_company_invitation(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.accept_company_invitation(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid,_role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id=_user_id
      AND (role=_role OR (_role='admin' AND role='super_admin'))
  );
$$;
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid,_permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role=ur.role
    WHERE ur.user_id=_user_id AND (rp.permission=_permission OR rp.permission='*')
  );
$$;
REVOKE ALL ON FUNCTION public.has_permission(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid,text)
  TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role)
  TO authenticated,service_role;

-- Source: supabase/migrations/20260725210000_listing_owner_integrity.sql
-- Tie every listing, including store products, to its canonical company owner.
-- Additive and non-destructive: existing rows are backfilled from companies.

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

-- Source: supabase/migrations/20260725220000_storage_update_ownership.sql
-- Prevent authenticated users from moving an object they own into another
-- user's or company's namespace during an UPDATE operation.
--
-- PostgreSQL evaluates USING against the old row and WITH CHECK against the
-- new row. Both predicates are required for ownership-safe Storage updates.

DROP POLICY IF EXISTS "Authenticated update own listing-media" ON storage.objects;
CREATE POLICY "Authenticated update own listing-media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'listing-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'listing-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Authenticated update own company-assets" ON storage.objects;
CREATE POLICY "Authenticated update own company-assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'company-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Authenticated update own avatars" ON storage.objects;
CREATE POLICY "Authenticated update own avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "company-catalogs owner update" ON storage.objects;
CREATE POLICY "company-catalogs owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-catalogs'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'company-catalogs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "rfq-attachments buyer update" ON storage.objects;
CREATE POLICY "rfq-attachments buyer update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'rfq-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.rfqs r
    WHERE r.id::text = (storage.foldername(name))[1]
      AND r.buyer_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'rfq-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.rfqs r
    WHERE r.id::text = (storage.foldername(name))[1]
      AND r.buyer_id = auth.uid()
  )
);

-- Source: supabase/migrations/20260727170000_harden_identity_tenant_integrity.sql
-- Harden public signup and tenant ownership invariants.
-- Additive/convergent only: no production rows are deleted or rewritten.

-- Public signup can select product account types only. Operational roles such
-- as admin and super_admin must only be granted by an existing administrator.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  requested_role text := lower(btrim(coalesce(NEW.raw_user_meta_data ->> 'role', '')));
  safe_role public.app_role;
BEGIN
  safe_role := CASE requested_role
    WHEN 'company' THEN 'company'::public.app_role
    WHEN 'agent' THEN 'agent'::public.app_role
    WHEN 'customer' THEN 'customer'::public.app_role
    ELSE 'customer'::public.app_role
  END;

  INSERT INTO public.profiles (id, full_name, avatar_url, display_name, phone)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, safe_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Only the canonical company owner may hold the protected workspace owner role.
CREATE OR REPLACE FUNCTION public.enforce_company_member_owner_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  canonical_owner uuid;
BEGIN
  IF NEW.role = 'owner' THEN
    SELECT company.owner_id
      INTO canonical_owner
      FROM public.companies AS company
     WHERE company.id = NEW.company_id;

    IF canonical_owner IS NULL OR NEW.user_id IS DISTINCT FROM canonical_owner THEN
      RAISE EXCEPTION 'company_member_owner_must_match_company_owner'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_company_member_owner_role()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_company_member_owner_role ON public.company_members;
CREATE TRIGGER trg_enforce_company_member_owner_role
BEFORE INSERT OR UPDATE OF company_id, user_id, role ON public.company_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_company_member_owner_role();

DROP POLICY IF EXISTS "company_members_admin_insert" ON public.company_members;
CREATE POLICY "company_members_admin_insert"
ON public.company_members FOR INSERT TO authenticated
WITH CHECK (
  role <> 'owner'
  AND public.has_company_permission(company_id, 'members.manage', auth.uid())
);

-- Derive listing ownership from the company and prevent cross-tenant store or
-- store-category references. Browser-supplied ownership is never authoritative.
CREATE OR REPLACE FUNCTION public.enforce_listing_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  canonical_owner uuid;
  canonical_store_owner uuid;
  canonical_store_company uuid;
  canonical_category_store uuid;
BEGIN
  SELECT company.owner_id
    INTO canonical_owner
    FROM public.companies AS company
   WHERE company.id = NEW.company_id;

  IF canonical_owner IS NULL THEN
    RAISE EXCEPTION 'listing_company_owner_not_found' USING ERRCODE = '23503';
  END IF;

  IF NEW.store_id IS NOT NULL THEN
    SELECT store.owner_id, store.company_id
      INTO canonical_store_owner, canonical_store_company
      FROM public.stores AS store
     WHERE store.id = NEW.store_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'listing_store_not_found' USING ERRCODE = '23503';
    END IF;

    IF canonical_store_company IS DISTINCT FROM NEW.company_id
       OR canonical_store_owner IS DISTINCT FROM canonical_owner THEN
      RAISE EXCEPTION 'listing_store_company_owner_mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.store_category_id IS NOT NULL THEN
    SELECT category.store_id
      INTO canonical_category_store
      FROM public.store_categories AS category
     WHERE category.id = NEW.store_category_id;

    IF NOT FOUND OR NEW.store_id IS NULL
       OR canonical_category_store IS DISTINCT FROM NEW.store_id THEN
      RAISE EXCEPTION 'listing_store_category_mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  NEW.owner_id := canonical_owner;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_listing_owner()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_listing_owner ON public.listings;
CREATE TRIGGER trg_enforce_listing_owner
BEFORE INSERT OR UPDATE OF company_id, owner_id, store_id, store_category_id
ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_listing_owner();

-- Lead creation is already implemented by the validated server function.
-- Disable direct Data API writes that can spoof company, buyer, or status.
REVOKE INSERT ON public.leads FROM anon, authenticated;
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;
DROP POLICY IF EXISTS "Public can submit valid lead" ON public.leads;

-- An activity may never be moved to a lead belonging to another company.
DROP POLICY IF EXISTS "crm_activities_company_update" ON public.crm_activities;
CREATE POLICY "crm_activities_company_update"
ON public.crm_activities FOR UPDATE TO authenticated
USING (
  actor_id = auth.uid()
  AND public.has_company_permission(company_id, 'crm.manage', auth.uid())
)
WITH CHECK (
  actor_id = auth.uid()
  AND public.has_company_permission(company_id, 'crm.manage', auth.uid())
  AND EXISTS (
    SELECT 1
      FROM public.leads AS lead
     WHERE lead.id = lead_id
       AND lead.company_id = company_id
  )
);

-- Source: supabase/migrations/20260727173000_atomic_checkout_orders.sql
-- Server-authoritative checkout and quotation conversion.
-- This migration removes direct authenticated order writes after both supported
-- creation flows have atomic SECURITY DEFINER entry points.

CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_buyer_id uuid,
  p_listing_id uuid,
  p_quantity integer,
  p_notes text,
  p_contact_phone text,
  p_shipping_address jsonb,
  p_shipping_amount numeric,
  p_shipping_eta_min_days integer,
  p_shipping_eta_max_days integer,
  p_checkout_session_id uuid,
  p_referral_code text,
  p_coupon_code text,
  p_conversation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  listing_row public.listings%ROWTYPE;
  store_row public.stores%ROWTYPE;
  coupon_row public.store_coupons%ROWTYPE;
  existing_order_id uuid;
  new_order_id uuid;
  canonical_referral_code text;
  unit_price numeric(14,2);
  subtotal_amount numeric(14,2);
  discount_amount numeric(14,2) := 0;
  shipping_amount numeric(14,2) := 0;
  shipping_eta_min integer;
  shipping_eta_max integer;
  governorate_key text;
  inventory_balance integer;
  inventory_location_id uuid;
BEGIN
  IF auth.uid() IS NULL OR p_buyer_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'checkout_buyer_mismatch' USING ERRCODE = '42501';
  END IF;
  IF p_checkout_session_id IS NULL THEN
    RAISE EXCEPTION 'checkout_session_required' USING ERRCODE = '22023';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'invalid_order_quantity' USING ERRCODE = '22023';
  END IF;

  SELECT order_row.id
    INTO existing_order_id
    FROM public.wholesale_orders AS order_row
   WHERE order_row.buyer_id = auth.uid()
     AND order_row.checkout_session_id = p_checkout_session_id
     AND order_row.product_listing_id = p_listing_id
   LIMIT 1;
  IF existing_order_id IS NOT NULL THEN
    RETURN jsonb_build_object('order_id', existing_order_id, 'idempotent', true);
  END IF;

  SELECT *
    INTO listing_row
    FROM public.listings
   WHERE id = p_listing_id
   FOR UPDATE;
  IF NOT FOUND OR listing_row.type <> 'product' OR listing_row.status <> 'approved' THEN
    RAISE EXCEPTION 'product_unavailable' USING ERRCODE = 'P0001';
  END IF;
  IF p_quantity < coalesce(listing_row.min_order_quantity, 1) THEN
    RAISE EXCEPTION 'minimum_order_quantity_not_met' USING ERRCODE = '22023';
  END IF;
  IF listing_row.owner_id = auth.uid() THEN
    RAISE EXCEPTION 'seller_cannot_buy_own_product' USING ERRCODE = '42501';
  END IF;
  IF NOT coalesce(listing_row.visible_in_marketplace, false)
     AND NOT coalesce(listing_row.visible_in_store, false) THEN
    RAISE EXCEPTION 'product_not_visible' USING ERRCODE = 'P0001';
  END IF;

  IF listing_row.store_id IS NOT NULL THEN
    SELECT *
      INTO store_row
      FROM public.stores
     WHERE id = listing_row.store_id;
    IF NOT FOUND
       OR store_row.status <> 'published'
       OR store_row.company_id IS DISTINCT FROM listing_row.company_id
       OR store_row.owner_id IS DISTINCT FROM listing_row.owner_id THEN
      RAISE EXCEPTION 'store_unavailable_or_mismatched' USING ERRCODE = '42501';
    END IF;
  END IF;

  unit_price := coalesce(listing_row.sale_price, listing_row.price);
  IF unit_price IS NULL OR unit_price <= 0 THEN
    RAISE EXCEPTION 'invalid_product_price' USING ERRCODE = 'P0001';
  END IF;
  subtotal_amount := round(unit_price * p_quantity, 2);

  -- Shipping values sent by the browser are compatibility-only. The database
  -- derives the canonical quote from the address governorate.
  IF p_shipping_address IS NOT NULL THEN
    governorate_key := lower(btrim(coalesce(p_shipping_address ->> 'governorate', '')));
    IF governorate_key IN ('القاهرة', 'القاهره', 'cairo', 'الجيزة', 'الجيزه', 'giza') THEN
      shipping_amount := 70; shipping_eta_min := 1; shipping_eta_max := 2;
    ELSIF governorate_key IN (
      'الإسكندرية', 'الاسكندرية', 'الاسكندريه', 'alexandria', 'البحيرة', 'البحيره', 'beheira'
    ) THEN
      shipping_amount := 85; shipping_eta_min := 2; shipping_eta_max := 3;
    ELSIF governorate_key IN (
      'القليوبية', 'القليوبيه', 'المنوفية', 'المنوفيه', 'الغربية', 'الغربيه',
      'الدقهلية', 'الدقهليه', 'الشرقية', 'الشرقيه', 'كفر الشيخ', 'دمياط',
      'بورسعيد', 'الإسماعيلية', 'الاسماعيلية', 'الاسماعيليه', 'السويس',
      'qalyubia', 'monufia', 'gharbia', 'dakahlia', 'sharqia',
      'kafr el sheikh', 'damietta', 'port said', 'ismailia', 'suez'
    ) THEN
      shipping_amount := 95; shipping_eta_min := 2; shipping_eta_max := 4;
    ELSIF governorate_key IN (
      'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'اسيوط', 'سوهاج', 'قنا',
      'الأقصر', 'الاقصر', 'أسوان', 'اسوان', 'fayoum', 'beni suef',
      'minya', 'assiut', 'sohag', 'qena', 'luxor', 'aswan'
    ) THEN
      shipping_amount := 120; shipping_eta_min := 3; shipping_eta_max := 5;
    ELSE
      shipping_amount := 140; shipping_eta_min := 3; shipping_eta_max := 6;
    END IF;
  END IF;

  IF p_conversation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM public.conversations AS conversation
     WHERE conversation.id = p_conversation_id
       AND conversation.listing_id = listing_row.id
       AND conversation.buyer_id = auth.uid()
       AND conversation.seller_id = listing_row.owner_id
  ) THEN
    RAISE EXCEPTION 'invalid_order_conversation' USING ERRCODE = '42501';
  END IF;

  IF p_referral_code IS NOT NULL THEN
    SELECT referral.code
      INTO canonical_referral_code
      FROM public.referrals AS referral
     WHERE referral.code = p_referral_code
       AND referral.listing_id = listing_row.id
     LIMIT 1;
  END IF;

  IF p_coupon_code IS NOT NULL THEN
    IF listing_row.store_id IS NULL THEN
      RAISE EXCEPTION 'coupon_requires_store_product' USING ERRCODE = '22023';
    END IF;
    SELECT *
      INTO coupon_row
      FROM public.store_coupons
     WHERE store_id = listing_row.store_id
       AND upper(code) = upper(btrim(p_coupon_code))
     FOR UPDATE;
    IF NOT FOUND
       OR NOT coupon_row.active
       OR (coupon_row.starts_at IS NOT NULL AND coupon_row.starts_at > now())
       OR (coupon_row.ends_at IS NOT NULL AND coupon_row.ends_at < now())
       OR subtotal_amount < coupon_row.min_order
       OR (
         coupon_row.usage_limit_total IS NOT NULL
         AND coupon_row.used_count >= coupon_row.usage_limit_total
       )
       OR (
         SELECT count(*)
           FROM public.store_coupon_usage AS usage
          WHERE usage.coupon_id = coupon_row.id
            AND usage.user_id = auth.uid()
       ) >= coupon_row.usage_limit_per_user THEN
      RAISE EXCEPTION 'coupon_invalid_or_exhausted' USING ERRCODE = 'P0001';
    END IF;
    IF coupon_row.applies_to <> '{}'::jsonb
       AND (
         jsonb_typeof(coupon_row.applies_to -> 'listing_ids') <> 'array'
         OR NOT EXISTS (
           SELECT 1
             FROM jsonb_array_elements_text(coupon_row.applies_to -> 'listing_ids') AS item(value)
            WHERE item.value = listing_row.id::text
         )
       ) THEN
      RAISE EXCEPTION 'coupon_not_applicable' USING ERRCODE = 'P0001';
    END IF;

    discount_amount := CASE coupon_row.type::text
      WHEN 'percent' THEN subtotal_amount * coupon_row.value / 100
      ELSE coupon_row.value
    END;
    discount_amount := least(
      subtotal_amount,
      coalesce(coupon_row.max_discount, discount_amount),
      discount_amount
    );
    discount_amount := round(greatest(discount_amount, 0), 2);
  END IF;

  IF coalesce(listing_row.track_inventory, false) THEN
    IF listing_row.stock_quantity IS NULL OR listing_row.stock_quantity < p_quantity THEN
      RAISE EXCEPTION 'insufficient_inventory' USING ERRCODE = 'P0001';
    END IF;
    inventory_balance := listing_row.stock_quantity - p_quantity;
  END IF;

  INSERT INTO public.wholesale_orders (
    buyer_id, listing_id, product_listing_id, store_id, quantity, notes,
    contact_phone, status, shipping_address, unit_price, subtotal,
    discount_amount, shipping_amount, shipping_eta_min_days,
    shipping_eta_max_days, total_amount, currency, payment_status,
    conversation_id, referral_code, coupon_code, checkout_session_id,
    idempotency_key, inventory_reserved_at, inventory_released_at
  )
  VALUES (
    auth.uid(), NULL, listing_row.id, listing_row.store_id, p_quantity, p_notes,
    p_contact_phone, 'awaiting_seller', p_shipping_address, unit_price,
    subtotal_amount, discount_amount, shipping_amount, shipping_eta_min,
    shipping_eta_max, greatest(subtotal_amount - discount_amount, 0) + shipping_amount,
    coalesce(listing_row.currency, 'EGP'), 'unpaid', p_conversation_id,
    canonical_referral_code, CASE WHEN coupon_row.id IS NULL THEN NULL ELSE coupon_row.code END,
    p_checkout_session_id, p_checkout_session_id::text,
    CASE WHEN coalesce(listing_row.track_inventory, false) THEN now() ELSE NULL END,
    NULL
  )
  ON CONFLICT (buyer_id, checkout_session_id, product_listing_id)
    WHERE checkout_session_id IS NOT NULL AND product_listing_id IS NOT NULL
  DO NOTHING
  RETURNING id INTO new_order_id;

  IF new_order_id IS NULL THEN
    SELECT order_row.id
      INTO new_order_id
      FROM public.wholesale_orders AS order_row
     WHERE order_row.buyer_id = auth.uid()
       AND order_row.checkout_session_id = p_checkout_session_id
       AND order_row.product_listing_id = listing_row.id;
    RETURN jsonb_build_object('order_id', new_order_id, 'idempotent', true);
  END IF;

  IF coalesce(listing_row.track_inventory, false) THEN
    UPDATE public.listings
       SET stock_quantity = inventory_balance,
           updated_at = now()
     WHERE id = listing_row.id;

    SELECT location.id
      INTO inventory_location_id
      FROM public.inventory_locations AS location
     WHERE location.company_id = listing_row.company_id
       AND location.active
     ORDER BY location.is_default DESC, location.created_at
     LIMIT 1;

    INSERT INTO public.inventory_movements (
      company_id, listing_id, location_id, movement_type, quantity_delta,
      balance_after, reference_type, reference_id, note, created_by
    )
    VALUES (
      listing_row.company_id, listing_row.id, inventory_location_id, 'sale',
      -p_quantity, inventory_balance, 'order', new_order_id,
      'حجز مخزون عند إنشاء الطلب', auth.uid()
    );
  END IF;

  IF coupon_row.id IS NOT NULL THEN
    INSERT INTO public.store_coupon_usage (
      coupon_id, user_id, order_id, discount_amount
    )
    VALUES (coupon_row.id, auth.uid(), new_order_id, discount_amount);
  END IF;

  RETURN jsonb_build_object(
    'order_id', new_order_id,
    'idempotent', false,
    'subtotal', subtotal_amount,
    'discount', discount_amount,
    'shipping', shipping_amount,
    'total', greatest(subtotal_amount - discount_amount, 0) + shipping_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_atomic(
  uuid, uuid, integer, text, text, jsonb, numeric, integer, integer,
  uuid, text, text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(
  uuid, uuid, integer, text, text, jsonb, numeric, integer, integer,
  uuid, text, text, uuid
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.accept_quotation_atomic(
  p_quotation_id uuid,
  p_shipping_address jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  quotation_row public.quotations%ROWTYPE;
  listing_row public.listings%ROWTYPE;
  first_listing_id uuid;
  total_quantity integer;
  new_order_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO quotation_row
    FROM public.quotations
   WHERE id = p_quotation_id
   FOR UPDATE;
  IF NOT FOUND OR quotation_row.buyer_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'quotation_not_found_or_forbidden' USING ERRCODE = '42501';
  END IF;

  IF quotation_row.status = 'converted' AND quotation_row.order_id IS NOT NULL THEN
    RETURN jsonb_build_object('order_id', quotation_row.order_id, 'idempotent', true);
  END IF;
  IF quotation_row.status NOT IN ('sent', 'draft') THEN
    RAISE EXCEPTION 'quotation_cannot_be_converted' USING ERRCODE = 'P0001';
  END IF;
  IF quotation_row.expiry_date IS NOT NULL AND quotation_row.expiry_date < current_date THEN
    RAISE EXCEPTION 'quotation_expired' USING ERRCODE = 'P0001';
  END IF;

  SELECT item.listing_id
    INTO first_listing_id
    FROM public.quotation_items AS item
   WHERE item.quotation_id = quotation_row.id
   ORDER BY item.created_at, item.id
   LIMIT 1;

  SELECT greatest(1, round(sum(item.quantity))::integer)
    INTO total_quantity
    FROM public.quotation_items AS item
   WHERE item.quotation_id = quotation_row.id;

  IF first_listing_id IS NOT NULL THEN
    SELECT *
      INTO listing_row
      FROM public.listings
     WHERE id = first_listing_id;
    IF NOT FOUND
       OR listing_row.company_id IS DISTINCT FROM quotation_row.seller_company_id
       OR listing_row.owner_id IS DISTINCT FROM quotation_row.seller_id THEN
      RAISE EXCEPTION 'quotation_listing_seller_mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.wholesale_orders (
    buyer_id, product_listing_id, store_id, quantity, status, unit_price,
    subtotal, discount_amount, shipping_amount, total_amount, currency,
    shipping_address, conversation_id, payment_status, quotation_id, notes
  )
  VALUES (
    auth.uid(), first_listing_id, listing_row.store_id, coalesce(total_quantity, 1),
    'accepted', CASE WHEN coalesce(total_quantity, 0) > 0
      THEN quotation_row.total / total_quantity ELSE quotation_row.total END,
    quotation_row.subtotal, quotation_row.discount, quotation_row.shipping,
    quotation_row.total, quotation_row.currency, p_shipping_address,
    quotation_row.conversation_id, 'unpaid', quotation_row.id, quotation_row.notes
  )
  RETURNING id INTO new_order_id;

  UPDATE public.quotations
     SET status = 'converted',
         order_id = new_order_id,
         updated_at = now()
   WHERE id = quotation_row.id;

  RETURN jsonb_build_object('order_id', new_order_id, 'idempotent', false);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_quotation_atomic(uuid, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_quotation_atomic(uuid, jsonb)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.record_released_order_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  listing_row public.listings%ROWTYPE;
  inventory_location_id uuid;
BEGIN
  IF OLD.inventory_released_at IS NULL AND NEW.inventory_released_at IS NOT NULL THEN
    SELECT *
      INTO listing_row
      FROM public.listings
     WHERE id = coalesce(NEW.product_listing_id, NEW.listing_id);

    IF FOUND AND coalesce(listing_row.track_inventory, false) THEN
      SELECT location.id
        INTO inventory_location_id
        FROM public.inventory_locations AS location
       WHERE location.company_id = listing_row.company_id
         AND location.active
       ORDER BY location.is_default DESC, location.created_at
       LIMIT 1;

      INSERT INTO public.inventory_movements (
        company_id, listing_id, location_id, movement_type, quantity_delta,
        balance_after, reference_type, reference_id, note, created_by
      )
      VALUES (
        listing_row.company_id, listing_row.id, inventory_location_id, 'return',
        NEW.quantity, coalesce(listing_row.stock_quantity, 0), 'order', NEW.id,
        'إعادة مخزون بعد إلغاء أو رفض الطلب', coalesce(auth.uid(), NEW.buyer_id)
      );
    END IF;

    -- Keep the coupon usage row as immutable financial history. Removing it
    -- would make a cancelled order reusable as if it never happened and would
    -- make this otherwise additive migration destructive.
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.record_released_order_inventory()
  FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_record_released_order_inventory ON public.wholesale_orders;
CREATE TRIGGER trg_record_released_order_inventory
AFTER UPDATE OF payment_status, status ON public.wholesale_orders
FOR EACH ROW EXECUTE FUNCTION public.record_released_order_inventory();

-- All client order creation now goes through the two validated RPCs above.
DROP POLICY IF EXISTS "wholesale_orders buyer insert" ON public.wholesale_orders;
REVOKE INSERT ON public.wholesale_orders FROM authenticated;
DROP POLICY IF EXISTS "wholesale_orders company update" ON public.wholesale_orders;
REVOKE UPDATE ON public.wholesale_orders FROM authenticated;
DROP POLICY IF EXISTS "store_coupon_usage_self_insert" ON public.store_coupon_usage;
REVOKE INSERT ON public.store_coupon_usage FROM authenticated;

-- Source: supabase/migrations/20260728000050_payout_processing_enum.sql
-- Kept in its own migration because PostgreSQL requires a commit after
-- adding an enum value before that value is used by later DDL/functions.
ALTER TYPE public.payout_status ADD VALUE IF NOT EXISTS 'processing';

-- Source: supabase/migrations/20260728000100_paymob_financial_boundaries.sql
-- Souqly payment security boundary.
-- Prepared for an isolated test project first. DO NOT apply to production
-- until the test migration, RLS matrix, and Paymob sandbox reports pass.

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_reference uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  idempotency_key uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  company_id uuid REFERENCES public.companies(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES public.wholesale_orders(id) ON DELETE RESTRICT,
  purpose text NOT NULL CHECK (purpose IN ('company_subscription', 'marketplace_order')),
  plan public.subscription_plan,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  provider text NOT NULL DEFAULT 'paymob' CHECK (provider = 'paymob'),
  provider_intention_id text,
  provider_transaction_id text UNIQUE,
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'pending', 'paid', 'failed', 'cancelled', 'expired', 'refunded')),
  failure_code text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_target_chk CHECK (
    (purpose = 'company_subscription' AND company_id IS NOT NULL AND order_id IS NULL AND plan = 'premium_company')
    OR
    (purpose = 'marketplace_order' AND order_id IS NOT NULL AND plan IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS payment_transactions_user_created_idx
  ON public.payment_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_transactions_status_idx
  ON public.payment_transactions(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.payment_transactions(id) ON DELETE RESTRICT,
  provider text NOT NULL DEFAULT 'paymob' CHECK (provider = 'paymob'),
  provider_event_key text NOT NULL UNIQUE,
  payload_hash text NOT NULL,
  signature_valid boolean NOT NULL,
  processing_status text NOT NULL
    CHECK (processing_status IN ('accepted', 'rejected', 'duplicate', 'ignored')),
  reason_code text,
  sanitized_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS payment_events_transaction_idx
  ON public.payment_events(transaction_id, received_at DESC);

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE RESTRICT,
  payment_transaction_id uuid REFERENCES public.payment_transactions(id) ON DELETE RESTRICT,
  event_type text NOT NULL
    CHECK (event_type IN ('activated', 'renewed', 'expired', 'cancelled', 'payment_failed')),
  from_expires_at timestamptz,
  to_expires_at timestamptz,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.payment_transactions FROM anon, authenticated;
REVOKE ALL ON public.payment_events FROM anon, authenticated;
REVOKE ALL ON public.subscription_events FROM anon, authenticated;
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT SELECT ON public.subscription_events TO authenticated;
GRANT ALL ON public.payment_transactions, public.payment_events, public.subscription_events TO service_role;

DROP POLICY IF EXISTS "Users view own payment transactions" ON public.payment_transactions;
CREATE POLICY "Users view own payment transactions"
  ON public.payment_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users view own subscription events" ON public.subscription_events;
CREATE POLICY "Users view own subscription events"
  ON public.subscription_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.id = subscription_events.subscription_id AND s.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Admins view payment events" ON public.payment_events;
CREATE POLICY "Admins view payment events"
  ON public.payment_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- A user must never create or activate a subscription directly.
DROP POLICY IF EXISTS "Users create own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users update own subscription" ON public.subscriptions;
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;

-- Server-side price and ownership resolution. The browser supplies neither
-- amount nor currency. Only service_role can call this function.
CREATE OR REPLACE FUNCTION public.create_paymob_payment_attempt(
  _user_id uuid,
  _purpose text,
  _company_id uuid,
  _order_id uuid,
  _plan text,
  _idempotency_key uuid
)
RETURNS TABLE (
  client_reference uuid,
  amount_cents bigint,
  currency text,
  status text,
  purpose text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount_cents bigint;
  v_currency text := 'EGP';
BEGIN
  IF _purpose = 'company_subscription' THEN
    IF _company_id IS NULL OR _plan IS DISTINCT FROM 'premium_company' THEN
      RAISE EXCEPTION 'INVALID_SUBSCRIPTION_TARGET';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = _company_id AND c.owner_id = _user_id
    ) THEN
      RAISE EXCEPTION 'FORBIDDEN_COMPANY';
    END IF;
    SELECT (COALESCE(ps.subscription_plan_price_egp, 499) * 100)::bigint
      INTO v_amount_cents
      FROM public.platform_settings ps
      LIMIT 1;
    v_amount_cents := COALESCE(v_amount_cents, 49900);
  ELSIF _purpose = 'marketplace_order' THEN
    IF _order_id IS NULL THEN
      RAISE EXCEPTION 'INVALID_ORDER_TARGET';
    END IF;
    SELECT round(wo.total_amount * 100)::bigint, upper(wo.currency)
      INTO v_amount_cents, v_currency
      FROM public.wholesale_orders wo
      WHERE wo.id = _order_id
        AND wo.buyer_id = _user_id
        AND wo.payment_status IS DISTINCT FROM 'paid';
    IF v_amount_cents IS NULL THEN
      RAISE EXCEPTION 'ORDER_NOT_PAYABLE';
    END IF;
  ELSE
    RAISE EXCEPTION 'INVALID_PAYMENT_PURPOSE';
  END IF;

  INSERT INTO public.payment_transactions (
    idempotency_key, user_id, company_id, order_id, purpose, plan,
    amount_cents, currency
  )
  VALUES (
    _idempotency_key, _user_id, _company_id, _order_id, _purpose,
    CASE WHEN _plan IS NULL THEN NULL ELSE _plan::public.subscription_plan END,
    v_amount_cents, v_currency
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN QUERY
  SELECT pt.client_reference, pt.amount_cents, pt.currency, pt.status, pt.purpose
  FROM public.payment_transactions pt
  WHERE pt.idempotency_key = _idempotency_key AND pt.user_id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_paymob_payment_attempt(uuid, text, uuid, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_paymob_payment_attempt(uuid, text, uuid, uuid, text, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.attach_paymob_intention(
  _client_reference uuid,
  _provider_intention_id text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.payment_transactions
  SET provider_intention_id = _provider_intention_id,
      status = CASE WHEN status = 'created' THEN 'pending' ELSE status END,
      updated_at = now()
  WHERE client_reference = _client_reference
    AND status IN ('created', 'pending');
$$;

REVOKE ALL ON FUNCTION public.attach_paymob_intention(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_paymob_intention(uuid, text) TO service_role;

-- Authenticated users can query only their own payment result. The provider
-- callback remains the only path that can mark it paid.
CREATE OR REPLACE FUNCTION public.get_my_payment_attempt(_client_reference uuid)
RETURNS TABLE (
  client_reference uuid,
  purpose text,
  amount_cents bigint,
  currency text,
  status text,
  failure_code text,
  created_at timestamptz,
  verified_at timestamptz
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT pt.client_reference, pt.purpose, pt.amount_cents, pt.currency,
         pt.status, pt.failure_code, pt.created_at, pt.verified_at
  FROM public.payment_transactions pt
  WHERE pt.client_reference = _client_reference
    AND (pt.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
$$;

REVOKE ALL ON FUNCTION public.get_my_payment_attempt(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_payment_attempt(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_rejected_paymob_event(
  _provider_event_key text,
  _payload_hash text,
  _reason_code text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.payment_events(
    provider_event_key, payload_hash, signature_valid, processing_status,
    reason_code, sanitized_payload, processed_at
  )
  VALUES (
    _provider_event_key, _payload_hash, false, 'rejected',
    left(_reason_code, 100), '{}'::jsonb, now()
  )
  ON CONFLICT (provider_event_key) DO NOTHING;
$$;

REVOKE ALL ON FUNCTION public.record_rejected_paymob_event(text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_rejected_paymob_event(text, text, text)
  TO service_role;

-- Atomic, idempotent webhook settlement. It validates the server-resolved
-- amount/currency and activates a subscription only after a verified success.
CREATE OR REPLACE FUNCTION public.process_verified_paymob_event(
  _client_reference uuid,
  _provider_transaction_id text,
  _provider_event_key text,
  _payload_hash text,
  _amount_cents bigint,
  _currency text,
  _success boolean,
  _sanitized_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx public.payment_transactions%ROWTYPE;
  v_subscription public.subscriptions%ROWTYPE;
  v_old_expiry timestamptz;
  v_new_expiry timestamptz;
BEGIN
  SELECT * INTO v_tx
  FROM public.payment_transactions
  WHERE client_reference = _client_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.payment_events (
      provider_event_key, payload_hash, signature_valid, processing_status,
      reason_code, sanitized_payload, processed_at
    ) VALUES (
      _provider_event_key, _payload_hash, true, 'rejected',
      'UNKNOWN_REFERENCE', _sanitized_payload, now()
    ) ON CONFLICT (provider_event_key) DO NOTHING;
    RETURN jsonb_build_object('result', 'rejected', 'reason', 'UNKNOWN_REFERENCE');
  END IF;

  INSERT INTO public.payment_events (
    transaction_id, provider_event_key, payload_hash, signature_valid,
    processing_status, sanitized_payload, processed_at
  ) VALUES (
    v_tx.id, _provider_event_key, _payload_hash, true,
    'accepted', _sanitized_payload, now()
  ) ON CONFLICT (provider_event_key) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'duplicate');
  END IF;

  IF v_tx.status = 'paid' THEN
    UPDATE public.payment_events
      SET processing_status = 'duplicate', reason_code = 'ALREADY_PAID'
      WHERE provider_event_key = _provider_event_key;
    RETURN jsonb_build_object('result', 'duplicate');
  END IF;

  IF v_tx.amount_cents <> _amount_cents OR v_tx.currency <> upper(_currency) THEN
    UPDATE public.payment_transactions
      SET status = 'failed', failure_code = 'AMOUNT_OR_CURRENCY_MISMATCH', updated_at = now()
      WHERE id = v_tx.id;
    UPDATE public.payment_events
      SET processing_status = 'rejected', reason_code = 'AMOUNT_OR_CURRENCY_MISMATCH'
      WHERE provider_event_key = _provider_event_key;
    RETURN jsonb_build_object('result', 'rejected', 'reason', 'AMOUNT_OR_CURRENCY_MISMATCH');
  END IF;

  IF NOT _success THEN
    UPDATE public.payment_transactions
      SET status = 'failed', failure_code = 'PROVIDER_DECLINED',
          provider_transaction_id = _provider_transaction_id, updated_at = now()
      WHERE id = v_tx.id;
    RETURN jsonb_build_object('result', 'failed');
  END IF;

  UPDATE public.payment_transactions
    SET status = 'paid', failure_code = NULL,
        provider_transaction_id = _provider_transaction_id,
        verified_at = now(), updated_at = now()
    WHERE id = v_tx.id;

  IF v_tx.purpose = 'company_subscription' THEN
    SELECT * INTO v_subscription
    FROM public.subscriptions
    WHERE user_id = v_tx.user_id AND plan = 'premium_company'
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    v_old_expiry := v_subscription.expires_at;
    v_new_expiry := GREATEST(COALESCE(v_old_expiry, now()), now()) + interval '1 month';

    IF v_subscription.id IS NULL THEN
      INSERT INTO public.subscriptions(user_id, plan, started_at, expires_at, is_active)
      VALUES (v_tx.user_id, 'premium_company', now(), v_new_expiry, true)
      RETURNING * INTO v_subscription;
    ELSE
      UPDATE public.subscriptions
      SET is_active = true, expires_at = v_new_expiry
      WHERE id = v_subscription.id
      RETURNING * INTO v_subscription;
    END IF;

    UPDATE public.companies
      SET subscription_plan = 'premium_company',
          subscription_expires_at = v_new_expiry,
          subscription_updated_at = now()
      WHERE id = v_tx.company_id AND owner_id = v_tx.user_id;

    INSERT INTO public.subscription_events(
      subscription_id, payment_transaction_id, event_type,
      from_expires_at, to_expires_at, actor_user_id
    ) VALUES (
      v_subscription.id, v_tx.id,
      CASE WHEN v_old_expiry IS NULL THEN 'activated' ELSE 'renewed' END,
      v_old_expiry, v_new_expiry, v_tx.user_id
    );
  ELSIF v_tx.purpose = 'marketplace_order' THEN
    UPDATE public.wholesale_orders
      SET payment_status = 'paid', updated_at = now()
      WHERE id = v_tx.order_id AND buyer_id = v_tx.user_id;
  END IF;

  RETURN jsonb_build_object('result', 'paid');
END;
$$;

REVOKE ALL ON FUNCTION public.process_verified_paymob_event(
  uuid, text, text, text, bigint, text, boolean, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_verified_paymob_event(
  uuid, text, text, text, bigint, text, boolean, jsonb
) TO service_role;

-- Payouts remain manual. Close cross-wallet and mutable-request loopholes.
ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS paid_reference text,
  ADD COLUMN IF NOT EXISTS paid_proof_url text,
  ADD COLUMN IF NOT EXISTS paid_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.payout_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_request_id uuid NOT NULL REFERENCES public.payout_requests(id) ON DELETE RESTRICT,
  from_status public.payout_status,
  to_status public.payout_status NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  paid_reference text,
  paid_proof_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payout_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payout_events FROM anon, authenticated;
GRANT SELECT ON public.payout_events TO authenticated;
GRANT ALL ON public.payout_events TO service_role;
CREATE POLICY "Users view own payout events"
  ON public.payout_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.payout_requests pr
      WHERE pr.id = payout_events.payout_request_id
        AND (pr.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS payout_requests_one_open_per_user_idx
  ON public.payout_requests(user_id)
  WHERE status IN ('pending', 'approved', 'processing');

CREATE OR REPLACE FUNCTION public.protect_payout_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.wallets w
    WHERE w.id = NEW.wallet_id AND w.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'PAYOUT_WALLET_OWNERSHIP_MISMATCH';
  END IF;
  IF NEW.payout_method_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.payout_methods pm
    WHERE pm.id = NEW.payout_method_id AND pm.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'PAYOUT_METHOD_OWNERSHIP_MISMATCH';
  END IF;

  IF TG_OP = 'UPDATE'
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.wallet_id IS DISTINCT FROM OLD.wallet_id
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.payout_method_id IS DISTINCT FROM OLD.payout_method_id
       OR NEW.notes IS DISTINCT FROM OLD.notes
       OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
       OR NEW.status NOT IN ('pending', 'cancelled') THEN
      RAISE EXCEPTION 'PAYOUT_REQUEST_IMMUTABLE';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_payout_request ON public.payout_requests;
CREATE TRIGGER trg_protect_payout_request
  BEFORE INSERT OR UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.protect_payout_request();

CREATE OR REPLACE FUNCTION public.protect_open_payout_method()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.payout_requests pr
    WHERE pr.payout_method_id = OLD.id AND pr.status IN ('pending', 'approved', 'processing')
  ) THEN
    RAISE EXCEPTION 'PAYOUT_METHOD_LOCKED_BY_OPEN_REQUEST';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_open_payout_method ON public.payout_methods;
CREATE TRIGGER trg_protect_open_payout_method
  BEFORE UPDATE OR DELETE ON public.payout_methods
  FOR EACH ROW EXECUTE FUNCTION public.protect_open_payout_method();

REVOKE ALL ON FUNCTION public.protect_payout_request() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_open_payout_method() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_transition_payout(
  _payout_id uuid,
  _action text,
  _admin_notes text DEFAULT NULL,
  _paid_reference text DEFAULT NULL,
  _paid_proof_url text DEFAULT NULL
)
RETURNS public.payout_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.payout_requests%ROWTYPE;
  v_new public.payout_requests%ROWTYPE;
  v_target public.payout_status;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_old FROM public.payout_requests
  WHERE id = _payout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAYOUT_NOT_FOUND'; END IF;

  v_target := CASE _action
    WHEN 'approve' THEN 'approved'::public.payout_status
    WHEN 'start_processing' THEN 'processing'::public.payout_status
    WHEN 'reject' THEN 'rejected'::public.payout_status
    WHEN 'paid' THEN 'paid'::public.payout_status
    ELSE NULL
  END;
  IF v_target IS NULL THEN RAISE EXCEPTION 'INVALID_PAYOUT_ACTION'; END IF;

  IF (v_old.status = 'pending' AND v_target NOT IN ('approved', 'rejected'))
     OR (v_old.status = 'approved' AND v_target NOT IN ('processing', 'rejected'))
     OR (v_old.status = 'processing' AND v_target NOT IN ('paid', 'rejected')) THEN
    RAISE EXCEPTION 'INVALID_PAYOUT_TRANSITION';
  END IF;

  IF v_target = 'paid'
     AND (NULLIF(trim(_paid_reference), '') IS NULL
          OR NULLIF(trim(_paid_proof_url), '') IS NULL) THEN
    RAISE EXCEPTION 'PAYOUT_PROOF_REQUIRED';
  END IF;

  UPDATE public.payout_requests
  SET status = v_target,
      admin_notes = NULLIF(trim(_admin_notes), ''),
      paid_reference = CASE WHEN v_target = 'paid' THEN trim(_paid_reference) ELSE paid_reference END,
      paid_proof_url = CASE WHEN v_target = 'paid' THEN trim(_paid_proof_url) ELSE paid_proof_url END,
      paid_by = CASE WHEN v_target = 'paid' THEN auth.uid() ELSE paid_by END,
      updated_at = now()
  WHERE id = _payout_id
  RETURNING * INTO v_new;

  INSERT INTO public.payout_events(
    payout_request_id, from_status, to_status, actor_user_id, notes,
    paid_reference, paid_proof_url
  ) VALUES (
    v_new.id, v_old.status, v_new.status, auth.uid(), NULLIF(trim(_admin_notes), ''),
    CASE WHEN v_new.status = 'paid' THEN v_new.paid_reference END,
    CASE WHEN v_new.status = 'paid' THEN v_new.paid_proof_url END
  );
  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_transition_payout(uuid, text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_transition_payout(uuid, text, text, text, text)
  TO authenticated;

-- Include the processing state in hold refunds.
CREATE OR REPLACE FUNCTION public.payout_wallet_flow()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_avail numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT balance INTO v_avail FROM public.wallets WHERE id = NEW.wallet_id FOR UPDATE;
    IF v_avail IS NULL OR v_avail < NEW.amount THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
    UPDATE public.wallets
      SET balance = balance - NEW.amount,
          pending_balance = pending_balance + NEW.amount
      WHERE id = NEW.wallet_id;
    INSERT INTO public.wallet_transactions(wallet_id, amount, currency, reason, reference_id, reference_type, notes)
      VALUES (NEW.wallet_id, 0, NEW.currency, 'payout', NEW.id, 'payout_request', 'Payout requested - held');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('rejected','cancelled') AND OLD.status IN ('pending','approved','processing') THEN
      UPDATE public.wallets
        SET balance = balance + OLD.amount,
            pending_balance = GREATEST(pending_balance - OLD.amount, 0)
        WHERE id = OLD.wallet_id;
      INSERT INTO public.wallet_transactions(wallet_id, amount, currency, reason, reference_id, reference_type, notes)
        VALUES (OLD.wallet_id, OLD.amount, OLD.currency, 'payout', OLD.id, 'payout_request', 'Payout ' || NEW.status || ' - refunded');
      NEW.processed_at := now();
    ELSIF NEW.status = 'paid' AND OLD.status = 'processing' THEN
      UPDATE public.wallets
        SET pending_balance = GREATEST(pending_balance - OLD.amount, 0),
            total_paid_out = total_paid_out + OLD.amount
        WHERE id = OLD.wallet_id;
      INSERT INTO public.wallet_transactions(wallet_id, amount, currency, reason, reference_id, reference_type, notes)
        VALUES (OLD.wallet_id, -OLD.amount, OLD.currency, 'payout', OLD.id, 'payout_request', 'Payout paid');
      NEW.processed_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Source: supabase/migrations/20260728000300_manual_subscription_payments.sql
-- Manual subscription payment workflow.
-- TEST FIRST. Do not apply to Production without a migration/RLS preflight.

ALTER TABLE public.payment_transactions
  DROP CONSTRAINT IF EXISTS payment_transactions_provider_check;
ALTER TABLE public.payment_transactions
  ADD CONSTRAINT payment_transactions_provider_check
  CHECK (provider IN ('paymob', 'manual'));

CREATE TABLE IF NOT EXISTS public.manual_payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  plan public.subscription_plan NOT NULL DEFAULT 'premium_company'
    CHECK (plan = 'premium_company'),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'EGP' CHECK (currency = 'EGP'),
  payment_method text NOT NULL CHECK (payment_method IN ('instapay', 'vodafone_cash')),
  destination_number text NOT NULL,
  sender_phone text NOT NULL,
  transfer_reference text,
  transferred_at timestamptz NOT NULL,
  proof_path text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  payment_transaction_id uuid REFERENCES public.payment_transactions(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT manual_payment_sender_phone_chk
    CHECK (sender_phone ~ '^\+?[0-9]{10,15}$'),
  CONSTRAINT manual_payment_reference_chk
    CHECK (transfer_reference IS NULL OR char_length(transfer_reference) <= 100),
  CONSTRAINT manual_payment_notes_chk
    CHECK (notes IS NULL OR char_length(notes) <= 500),
  CONSTRAINT manual_payment_proof_owner_path_chk
    CHECK (split_part(proof_path, '/', 1) = user_id::text)
);

CREATE UNIQUE INDEX IF NOT EXISTS manual_payment_one_pending_per_company_idx
  ON public.manual_payment_requests(company_id)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS manual_payment_user_created_idx
  ON public.manual_payment_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS manual_payment_admin_queue_idx
  ON public.manual_payment_requests(status, created_at DESC);

ALTER TABLE public.manual_payment_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.manual_payment_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.manual_payment_requests TO authenticated;
GRANT ALL ON public.manual_payment_requests TO service_role;

DROP POLICY IF EXISTS "Users read own manual payments" ON public.manual_payment_requests;
CREATE POLICY "Users read own manual payments"
  ON public.manual_payment_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'manual-payment-proofs',
  'manual-payment-proofs',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users upload own manual proof" ON storage.objects;
CREATE POLICY "Users upload own manual proof"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'manual-payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users read own manual proof" ON storage.objects;
CREATE POLICY "Users read own manual proof"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'manual-payment-proofs'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

DROP POLICY IF EXISTS "Users delete own unsubmitted manual proof" ON storage.objects;
CREATE POLICY "Users delete own unsubmitted manual proof"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'manual-payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND NOT EXISTS (
      SELECT 1
      FROM public.manual_payment_requests request
      WHERE request.proof_path = storage.objects.name
    )
  );

INSERT INTO public.payment_methods (
  code, name_ar, name_en, instructions_ar, instructions_en,
  account_details, icon, is_active, sort_order
)
VALUES
  (
    'instapay',
    'إنستا باي',
    'InstaPay',
    'حوّل المبلغ إلى الرقم الظاهر ثم ارفع صورة التحويل.',
    'Transfer the displayed amount, then upload the transfer receipt.',
    '{"phone":"+201140949424"}'::jsonb,
    '💳',
    true,
    10
  ),
  (
    'vodafone_cash',
    'فودافون كاش',
    'Vodafone Cash',
    'حوّل المبلغ إلى الرقم الظاهر ثم ارفع صورة التحويل.',
    'Transfer the displayed amount, then upload the transfer receipt.',
    '{"phone":"+201140949424"}'::jsonb,
    '📱',
    true,
    20
  )
ON CONFLICT (code) DO UPDATE
SET account_details = EXCLUDED.account_details,
    instructions_ar = EXCLUDED.instructions_ar,
    instructions_en = EXCLUDED.instructions_en,
    is_active = true,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.submit_manual_subscription_payment(
  _company_id uuid,
  _payment_method text,
  _sender_phone text,
  _transfer_reference text,
  _transferred_at timestamptz,
  _proof_path text,
  _notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_amount_cents bigint;
  v_request_id uuid;
  v_destination text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  IF _payment_method NOT IN ('instapay', 'vodafone_cash') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD';
  END IF;
  IF _sender_phone !~ '^\+?[0-9]{10,15}$' THEN
    RAISE EXCEPTION 'INVALID_SENDER_PHONE';
  END IF;
  IF _transferred_at > now() + interval '10 minutes'
     OR _transferred_at < now() - interval '7 days' THEN
    RAISE EXCEPTION 'INVALID_TRANSFER_TIME';
  END IF;
  IF split_part(_proof_path, '/', 1) <> v_user_id::text THEN
    RAISE EXCEPTION 'INVALID_PROOF_PATH';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = _company_id AND c.owner_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN_COMPANY';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.manual_payment_requests r
    WHERE r.company_id = _company_id AND r.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'PAYMENT_ALREADY_PENDING';
  END IF;

  SELECT (COALESCE(ps.subscription_plan_price_egp, 499) * 100)::bigint
  INTO v_amount_cents
  FROM public.platform_settings ps
  LIMIT 1;
  v_amount_cents := COALESCE(v_amount_cents, 49900);

  SELECT COALESCE(pm.account_details->>'phone', '+201140949424')
  INTO v_destination
  FROM public.payment_methods pm
  WHERE pm.code = _payment_method AND pm.is_active;
  IF v_destination IS NULL THEN
    RAISE EXCEPTION 'PAYMENT_METHOD_UNAVAILABLE';
  END IF;

  INSERT INTO public.manual_payment_requests (
    user_id, company_id, amount_cents, payment_method, destination_number,
    sender_phone, transfer_reference, transferred_at, proof_path, notes
  )
  VALUES (
    v_user_id, _company_id, v_amount_cents, _payment_method, v_destination,
    _sender_phone, NULLIF(trim(_transfer_reference), ''), _transferred_at,
    _proof_path, NULLIF(trim(_notes), '')
  )
  RETURNING id INTO v_request_id;

  INSERT INTO public.audit_logs(user_id, action, table_name, record_id, new_data)
  VALUES (
    v_user_id, 'MANUAL_PAYMENT_SUBMITTED', 'manual_payment_requests',
    v_request_id::text,
    jsonb_build_object('company_id', _company_id, 'method', _payment_method)
  );
  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_manual_subscription_payment(
  uuid, text, text, text, timestamptz, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_manual_subscription_payment(
  uuid, text, text, text, timestamptz, text, text
) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_manual_subscription_payment(
  _request_id uuid,
  _action text,
  _rejection_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_request public.manual_payment_requests%ROWTYPE;
  v_subscription public.subscriptions%ROWTYPE;
  v_old_expiry timestamptz;
  v_new_expiry timestamptz;
  v_transaction_id uuid;
BEGIN
  IF v_admin_id IS NULL OR NOT public.has_role(v_admin_id, 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF _action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'INVALID_ACTION';
  END IF;
  IF _action = 'reject' AND char_length(trim(COALESCE(_rejection_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'REJECTION_REASON_REQUIRED';
  END IF;

  SELECT * INTO v_request
  FROM public.manual_payment_requests
  WHERE id = _request_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_REQUEST_NOT_FOUND';
  END IF;
  IF v_request.status <> 'pending' THEN
    RETURN jsonb_build_object('result', 'already_reviewed', 'status', v_request.status);
  END IF;

  IF _action = 'reject' THEN
    UPDATE public.manual_payment_requests
    SET status = 'rejected',
        rejection_reason = trim(_rejection_reason),
        reviewed_by = v_admin_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = v_request.id;

    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (
      v_request.user_id, 'payment', 'تم رفض إثبات الدفع',
      trim(_rejection_reason), '/manual-payment?companyId=' || v_request.company_id::text
    );
    INSERT INTO public.audit_logs(user_id, action, table_name, record_id, old_data, new_data)
    VALUES (
      v_admin_id, 'MANUAL_PAYMENT_REJECTED', 'manual_payment_requests',
      v_request.id::text, to_jsonb(v_request),
      jsonb_build_object('status', 'rejected', 'reason', trim(_rejection_reason))
    );
    RETURN jsonb_build_object('result', 'rejected');
  END IF;

  INSERT INTO public.payment_transactions (
    idempotency_key, user_id, company_id, purpose, plan, amount_cents,
    currency, provider, provider_transaction_id, status, verified_at
  )
  VALUES (
    v_request.id, v_request.user_id, v_request.company_id,
    'company_subscription', 'premium_company', v_request.amount_cents,
    v_request.currency, 'manual', 'manual:' || v_request.id::text, 'paid', now()
  )
  ON CONFLICT (idempotency_key) DO UPDATE
  SET status = 'paid', verified_at = COALESCE(public.payment_transactions.verified_at, now())
  RETURNING id INTO v_transaction_id;

  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE user_id = v_request.user_id AND plan = 'premium_company'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  v_old_expiry := v_subscription.expires_at;
  v_new_expiry := GREATEST(COALESCE(v_old_expiry, now()), now()) + interval '1 month';

  IF v_subscription.id IS NULL THEN
    INSERT INTO public.subscriptions(user_id, plan, started_at, expires_at, is_active)
    VALUES (v_request.user_id, 'premium_company', now(), v_new_expiry, true)
    RETURNING * INTO v_subscription;
  ELSE
    UPDATE public.subscriptions
    SET is_active = true, expires_at = v_new_expiry
    WHERE id = v_subscription.id
    RETURNING * INTO v_subscription;
  END IF;

  UPDATE public.companies
  SET subscription_plan = 'premium_company',
      subscription_expires_at = v_new_expiry,
      subscription_updated_at = now()
  WHERE id = v_request.company_id AND owner_id = v_request.user_id;

  INSERT INTO public.subscription_events (
    subscription_id, payment_transaction_id, event_type,
    from_expires_at, to_expires_at, actor_user_id
  )
  VALUES (
    v_subscription.id, v_transaction_id,
    CASE WHEN v_old_expiry IS NULL OR v_old_expiry <= now() THEN 'activated' ELSE 'renewed' END,
    v_old_expiry, v_new_expiry, v_admin_id
  );

  UPDATE public.manual_payment_requests
  SET status = 'approved',
      rejection_reason = NULL,
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      payment_transaction_id = v_transaction_id,
      updated_at = now()
  WHERE id = v_request.id;

  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (
    v_request.user_id, 'payment', 'تم اعتماد الدفع وتفعيل الاشتراك',
    'تم تفعيل باقة الشركة المميزة حتى ' || to_char(v_new_expiry, 'YYYY-MM-DD'),
    '/dashboard'
  );
  INSERT INTO public.audit_logs(user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    v_admin_id, 'MANUAL_PAYMENT_APPROVED', 'manual_payment_requests',
    v_request.id::text, to_jsonb(v_request),
    jsonb_build_object(
      'status', 'approved',
      'payment_transaction_id', v_transaction_id,
      'subscription_expires_at', v_new_expiry
    )
  );

  RETURN jsonb_build_object(
    'result', 'approved',
    'payment_transaction_id', v_transaction_id,
    'subscription_expires_at', v_new_expiry
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_manual_subscription_payment(uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_manual_subscription_payment(uuid, text, text)
  TO authenticated;

-- Source: supabase/migrations/20260729090000_private_order_payment_proofs.sql
-- Private storage for financial proof documents.
-- Additive only: existing proof_url values remain readable during migration.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Payment proof owner uploads" ON storage.objects;
CREATE POLICY "Payment proof owner uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Payment proof owner reads" ON storage.objects;
CREATE POLICY "Payment proof owner reads"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

DROP POLICY IF EXISTS "Payment proof owner deletes unsubmitted" ON storage.objects;
CREATE POLICY "Payment proof owner deletes unsubmitted"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND NOT EXISTS (
    SELECT 1
    FROM public.payment_proofs proof
    WHERE proof.proof_url = name
  )
);

COMMENT ON COLUMN public.payment_proofs.proof_url IS
  'Private payment-proofs object path for new records; legacy rows may contain a signed URL.';

CREATE UNIQUE INDEX IF NOT EXISTS payment_proofs_one_pending_per_order_idx
ON public.payment_proofs (order_id)
WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.validate_order_payment_proof()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_order public.wholesale_orders%ROWTYPE;
  method_active boolean;
BEGIN
  SELECT *
  INTO target_order
  FROM public.wholesale_orders
  WHERE id = NEW.order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF auth.uid() IS NULL OR target_order.buyer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the buyer can submit a payment proof';
  END IF;
  IF target_order.payment_status = 'paid' THEN
    RAISE EXCEPTION 'Order is already paid';
  END IF;
  IF abs(NEW.amount - target_order.total_amount) > 0.01
     OR upper(NEW.currency) <> upper(COALESCE(target_order.currency, 'EGP')) THEN
    RAISE EXCEPTION 'Payment amount or currency does not match the order';
  END IF;

  SELECT is_active INTO method_active
  FROM public.payment_methods
  WHERE id = NEW.payment_method_id;
  IF NOT COALESCE(method_active, false) THEN
    RAISE EXCEPTION 'Payment method is not active';
  END IF;

  NEW.buyer_id := target_order.buyer_id;
  NEW.currency := upper(COALESCE(target_order.currency, 'EGP'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_order_payment_proof ON public.payment_proofs;
CREATE TRIGGER trg_validate_order_payment_proof
BEFORE INSERT ON public.payment_proofs
FOR EACH ROW EXECUTE FUNCTION public.validate_order_payment_proof();

CREATE OR REPLACE FUNCTION public.mark_order_payment_pending_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.wholesale_orders
  SET payment_status = 'pending_review', updated_at = now()
  WHERE id = NEW.order_id
    AND buyer_id = NEW.buyer_id
    AND payment_status <> 'paid';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_order_payment_pending_review ON public.payment_proofs;
CREATE TRIGGER trg_mark_order_payment_pending_review
AFTER INSERT ON public.payment_proofs
FOR EACH ROW EXECUTE FUNCTION public.mark_order_payment_pending_review();

COMMIT;
