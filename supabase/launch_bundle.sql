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

-- ---------------------------------------------------------------------------
-- 8. Identity and tenant integrity.
-- ---------------------------------------------------------------------------
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

REVOKE INSERT ON public.leads FROM anon, authenticated;
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;
DROP POLICY IF EXISTS "Public can submit valid lead" ON public.leads;

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

-- ---------------------------------------------------------------------------
-- 9. Storage UPDATE ownership checks.
-- ---------------------------------------------------------------------------
-- UPDATE policies need USING for the old row and WITH CHECK for the new row.
-- Without both, an owner could move an object into another user's namespace.
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

-- ---------------------------------------------------------------------------
-- 10. Server-authoritative checkout and quotation conversion.
-- ---------------------------------------------------------------------------

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

    DELETE FROM public.store_coupon_usage WHERE order_id = NEW.id;
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
DROP POLICY IF EXISTS "store_coupon_usage_self_insert" ON public.store_coupon_usage;
REVOKE INSERT ON public.store_coupon_usage FROM authenticated;

COMMIT;
