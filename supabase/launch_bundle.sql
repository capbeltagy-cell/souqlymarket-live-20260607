-- Souqly production launch bundle
-- Scope: post-baseline launch hardening only. This file never drops tables or data.
-- Safe to rerun: tables/indexes use IF NOT EXISTS; functions are replaced; convergent
-- policies/triggers are dropped and recreated because PostgreSQL has no CREATE OR REPLACE
-- for these object types.

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
SELECT pg_advisory_xact_lock(hashtext('souqly_launch_bundle_v2'));

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
    'public.store_coupons', 'public.store_coupon_usage', 'public.store_reviews',
    'public.companies', 'public.leads', 'public.user_roles', 'public.role_permissions'
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
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listings' AND column_name='company_id') THEN
    missing := array_append(missing, 'public.listings.company_id');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listings' AND column_name='stock_quantity') THEN
    missing := array_append(missing, 'public.listings.stock_quantity');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listings' AND column_name='track_inventory') THEN
    missing := array_append(missing, 'public.listings.track_inventory');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listings' AND column_name='updated_at') THEN
    missing := array_append(missing, 'public.listings.updated_at');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='company_id') THEN
    missing := array_append(missing, 'public.leads.company_id');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='status') THEN
    missing := array_append(missing, 'public.leads.status');
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'app_role'
      AND e.enumlabel = 'super_admin'
  ) THEN
    missing := array_append(missing, 'public.app_role value super_admin');
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

-- ---------------------------------------------------------------------------
-- 4. Company workspace membership and scoped permissions.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('owner', 'admin', 'manager', 'sales', 'inventory', 'viewer')),
  permissions text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);

CREATE INDEX IF NOT EXISTS company_members_user_idx
  ON public.company_members(user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS company_members_company_idx
  ON public.company_members(company_id, status);

CREATE TABLE IF NOT EXISTS public.company_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin', 'manager', 'sales', 'inventory', 'viewer')),
  permissions text[] NOT NULL DEFAULT ARRAY[]::text[],
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS company_invitations_pending_email_idx
  ON public.company_invitations(company_id, lower(email)) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS company_invitations_company_idx
  ON public.company_invitations(company_id, status);

CREATE OR REPLACE FUNCTION public.is_company_member(
  _company_id uuid,
  _user_id uuid DEFAULT auth.uid()
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = _company_id AND c.owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = _company_id
      AND cm.user_id = _user_id
      AND cm.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_company_permission(
  _company_id uuid,
  _permission text,
  _user_id uuid DEFAULT auth.uid()
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = _company_id AND c.owner_id = _user_id
  ) OR EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = _company_id
      AND cm.user_id = _user_id
      AND cm.status = 'active'
      AND (
        cm.role IN ('owner', 'admin')
        OR _permission = ANY(cm.permissions)
        OR (cm.role = 'manager' AND _permission = ANY(ARRAY[
          'workspace.view', 'crm.view', 'crm.manage', 'inventory.view',
          'inventory.manage', 'members.view'
        ]))
        OR (cm.role = 'sales' AND _permission = ANY(ARRAY[
          'workspace.view', 'crm.view', 'crm.manage'
        ]))
        OR (cm.role = 'inventory' AND _permission = ANY(ARRAY[
          'workspace.view', 'inventory.view', 'inventory.manage'
        ]))
        OR (cm.role = 'viewer' AND _permission = ANY(ARRAY[
          'workspace.view', 'crm.view', 'inventory.view', 'members.view'
        ]))
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_company_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_company_permission(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_company_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_company_permission(uuid, text, uuid) TO authenticated, service_role;

-- Backfill only the canonical owner relationship; no business record is deleted.
INSERT INTO public.company_members (company_id, user_id, role, permissions, status)
SELECT id, owner_id, 'owner', ARRAY[]::text[], 'active'
FROM public.companies
WHERE owner_id IS NOT NULL
ON CONFLICT (company_id, user_id) DO UPDATE
SET role = 'owner', status = 'active', updated_at = now();

CREATE OR REPLACE FUNCTION public.sync_company_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.company_members (company_id, user_id, role, permissions, status)
    VALUES (NEW.id, NEW.owner_id, 'owner', ARRAY[]::text[], 'active')
    ON CONFLICT (company_id, user_id) DO UPDATE
      SET role = 'owner', status = 'active', updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_company_owner_membership() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_sync_company_owner_membership ON public.companies;
CREATE TRIGGER trg_sync_company_owner_membership
AFTER INSERT OR UPDATE OF owner_id ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.sync_company_owner_membership();

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_members_workspace_read" ON public.company_members;
CREATE POLICY "company_members_workspace_read"
  ON public.company_members FOR SELECT TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));
DROP POLICY IF EXISTS "company_members_admin_insert" ON public.company_members;
CREATE POLICY "company_members_admin_insert"
  ON public.company_members FOR INSERT TO authenticated
  WITH CHECK (public.has_company_permission(company_id, 'members.manage', auth.uid()));
DROP POLICY IF EXISTS "company_members_admin_update" ON public.company_members;
CREATE POLICY "company_members_admin_update"
  ON public.company_members FOR UPDATE TO authenticated
  USING (public.has_company_permission(company_id, 'members.manage', auth.uid()) AND role <> 'owner')
  WITH CHECK (public.has_company_permission(company_id, 'members.manage', auth.uid()) AND role <> 'owner');
DROP POLICY IF EXISTS "company_members_admin_delete" ON public.company_members;
CREATE POLICY "company_members_admin_delete"
  ON public.company_members FOR DELETE TO authenticated
  USING (public.has_company_permission(company_id, 'members.manage', auth.uid()) AND role <> 'owner');

DROP POLICY IF EXISTS "company_invitations_workspace_read" ON public.company_invitations;
CREATE POLICY "company_invitations_workspace_read"
  ON public.company_invitations FOR SELECT TO authenticated
  USING (public.has_company_permission(company_id, 'members.view', auth.uid()));
DROP POLICY IF EXISTS "company_invitations_admin_insert" ON public.company_invitations;
CREATE POLICY "company_invitations_admin_insert"
  ON public.company_invitations FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND public.has_company_permission(company_id, 'members.manage', auth.uid())
  );
DROP POLICY IF EXISTS "company_invitations_admin_update" ON public.company_invitations;
CREATE POLICY "company_invitations_admin_update"
  ON public.company_invitations FOR UPDATE TO authenticated
  USING (public.has_company_permission(company_id, 'members.manage', auth.uid()))
  WITH CHECK (public.has_company_permission(company_id, 'members.manage', auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.company_invitations TO authenticated;
GRANT ALL ON public.company_members, public.company_invitations TO service_role;

-- ---------------------------------------------------------------------------
-- 5. CRM and inventory foundation. Existing leads/listings remain canonical.
-- ---------------------------------------------------------------------------
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS estimated_value numeric(14,2),
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS leads_company_status_idx ON public.leads(company_id, status);
CREATE INDEX IF NOT EXISTS leads_company_follow_up_idx
  ON public.leads(company_id, next_follow_up_at) WHERE next_follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_assigned_to_idx
  ON public.leads(assigned_to) WHERE assigned_to IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL
    CHECK (activity_type IN ('note', 'call', 'email', 'meeting', 'status_change')),
  body text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_activities_lead_idx
  ON public.crm_activities(lead_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS crm_activities_company_idx
  ON public.crm_activities(company_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.inventory_locations (
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
  UNIQUE (company_id, name)
);
CREATE UNIQUE INDEX IF NOT EXISTS inventory_locations_default_idx
  ON public.inventory_locations(company_id) WHERE is_default = true AND active = true;

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  location_id uuid REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
  movement_type text NOT NULL
    CHECK (movement_type IN (
      'opening', 'adjustment', 'purchase', 'sale', 'return', 'transfer_in', 'transfer_out'
    )),
  quantity_delta integer NOT NULL CHECK (quantity_delta <> 0),
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  reference_type text,
  reference_id uuid,
  note text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_movements_listing_idx
  ON public.inventory_movements(listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_movements_company_idx
  ON public.inventory_movements(company_id, created_at DESC);

ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_company_members_read" ON public.leads;
CREATE POLICY "leads_company_members_read" ON public.leads
  FOR SELECT TO authenticated
  USING (public.has_company_permission(company_id, 'crm.view', auth.uid()));
DROP POLICY IF EXISTS "leads_company_members_update" ON public.leads;
CREATE POLICY "leads_company_members_update" ON public.leads
  FOR UPDATE TO authenticated
  USING (public.has_company_permission(company_id, 'crm.manage', auth.uid()))
  WITH CHECK (public.has_company_permission(company_id, 'crm.manage', auth.uid()));
DROP POLICY IF EXISTS "listings_inventory_members_read" ON public.listings;
CREATE POLICY "listings_inventory_members_read" ON public.listings
  FOR SELECT TO authenticated
  USING (
    type = 'product'
    AND public.has_company_permission(company_id, 'inventory.view', auth.uid())
  );

DROP POLICY IF EXISTS "crm_activities_company_read" ON public.crm_activities;
CREATE POLICY "crm_activities_company_read" ON public.crm_activities
  FOR SELECT TO authenticated
  USING (public.has_company_permission(company_id, 'crm.view', auth.uid()));
DROP POLICY IF EXISTS "crm_activities_company_insert" ON public.crm_activities;
CREATE POLICY "crm_activities_company_insert" ON public.crm_activities
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND public.has_company_permission(company_id, 'crm.manage', auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.company_id = company_id
    )
  );
DROP POLICY IF EXISTS "crm_activities_company_update" ON public.crm_activities;
CREATE POLICY "crm_activities_company_update" ON public.crm_activities
  FOR UPDATE TO authenticated
  USING (
    actor_id = auth.uid()
    AND public.has_company_permission(company_id, 'crm.manage', auth.uid())
  )
  WITH CHECK (
    actor_id = auth.uid()
    AND public.has_company_permission(company_id, 'crm.manage', auth.uid())
  );

DROP POLICY IF EXISTS "inventory_locations_company_read" ON public.inventory_locations;
CREATE POLICY "inventory_locations_company_read" ON public.inventory_locations
  FOR SELECT TO authenticated
  USING (public.has_company_permission(company_id, 'inventory.view', auth.uid()));
DROP POLICY IF EXISTS "inventory_locations_company_manage" ON public.inventory_locations;
CREATE POLICY "inventory_locations_company_manage" ON public.inventory_locations
  FOR ALL TO authenticated
  USING (public.has_company_permission(company_id, 'inventory.manage', auth.uid()))
  WITH CHECK (
    created_by = auth.uid()
    AND public.has_company_permission(company_id, 'inventory.manage', auth.uid())
  );

DROP POLICY IF EXISTS "inventory_movements_company_read" ON public.inventory_movements;
CREATE POLICY "inventory_movements_company_read" ON public.inventory_movements
  FOR SELECT TO authenticated
  USING (public.has_company_permission(company_id, 'inventory.view', auth.uid()));
DROP POLICY IF EXISTS "inventory_movements_company_insert" ON public.inventory_movements;
CREATE POLICY "inventory_movements_company_insert" ON public.inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.has_company_permission(company_id, 'inventory.manage', auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id AND l.company_id = company_id AND l.type = 'product'
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.crm_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_locations TO authenticated;
GRANT SELECT, INSERT ON public.inventory_movements TO authenticated;
GRANT ALL ON public.crm_activities, public.inventory_locations, public.inventory_movements
  TO service_role;

CREATE OR REPLACE FUNCTION public.adjust_company_inventory(
  _listing_id uuid,
  _quantity_delta integer,
  _note text DEFAULT NULL,
  _location_id uuid DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_balance integer;
BEGIN
  IF _quantity_delta = 0 THEN RAISE EXCEPTION 'quantity_delta_must_not_be_zero'; END IF;

  SELECT company_id, COALESCE(stock_quantity, 0)
  INTO v_company_id, v_balance
  FROM public.listings
  WHERE id = _listing_id AND type = 'product'
  FOR UPDATE;

  IF v_company_id IS NULL THEN RAISE EXCEPTION 'product_not_found'; END IF;
  IF NOT public.has_company_permission(v_company_id, 'inventory.manage', auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_company_permission';
  END IF;
  IF _location_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.inventory_locations
    WHERE id = _location_id AND company_id = v_company_id AND active = true
  ) THEN
    RAISE EXCEPTION 'invalid_inventory_location';
  END IF;

  v_balance := v_balance + _quantity_delta;
  IF v_balance < 0 THEN RAISE EXCEPTION 'insufficient_inventory'; END IF;

  UPDATE public.listings
  SET stock_quantity = v_balance, track_inventory = true, updated_at = now()
  WHERE id = _listing_id;

  INSERT INTO public.inventory_movements (
    company_id, listing_id, location_id, movement_type, quantity_delta,
    balance_after, note, created_by
  ) VALUES (
    v_company_id, _listing_id, _location_id, 'adjustment', _quantity_delta,
    v_balance, NULLIF(trim(_note), ''), auth.uid()
  );
  RETURN v_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_company_inventory(uuid, integer, text, uuid)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_company_inventory(uuid, integer, text, uuid)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Secure invitation acceptance using a SHA-256 token hash.
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.accept_company_invitation(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_invitation public.company_invitations%ROWTYPE;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  v_email := lower(COALESCE(auth.jwt() ->> 'email', ''));
  IF v_email = '' THEN RAISE EXCEPTION 'verified_email_required'; END IF;

  SELECT * INTO v_invitation
  FROM public.company_invitations
  WHERE token_hash = encode(digest(_token, 'sha256'), 'hex')
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'invitation_not_found'; END IF;
  IF v_invitation.expires_at <= now() THEN
    UPDATE public.company_invitations
    SET status = 'expired', updated_at = now()
    WHERE id = v_invitation.id;
    RAISE EXCEPTION 'invitation_expired';
  END IF;
  IF lower(v_invitation.email) <> v_email THEN
    RAISE EXCEPTION 'invitation_email_mismatch';
  END IF;

  INSERT INTO public.company_members (
    company_id, user_id, role, permissions, status, invited_by
  ) VALUES (
    v_invitation.company_id, auth.uid(), v_invitation.role,
    v_invitation.permissions, 'active', v_invitation.invited_by
  )
  ON CONFLICT (company_id, user_id) DO UPDATE
    SET role = CASE WHEN company_members.role = 'owner' THEN 'owner' ELSE EXCLUDED.role END,
        permissions = CASE
          WHEN company_members.role = 'owner' THEN company_members.permissions
          ELSE EXCLUDED.permissions
        END,
        status = 'active',
        updated_at = now();

  UPDATE public.company_invitations
  SET status = 'accepted', accepted_at = now(), updated_at = now()
  WHERE id = v_invitation.id;

  RETURN v_invitation.company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_company_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_company_invitation(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Super-admin compatibility and wildcard role permissions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = _role OR (_role = 'admin' AND role = 'super_admin'))
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND (rp.permission = _permission OR rp.permission = '*')
  );
$$;

REVOKE ALL ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)
  TO authenticated, service_role;

COMMIT;
