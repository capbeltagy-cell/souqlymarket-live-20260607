-- Company workspace prerequisites used by the tenant, CRM and checkout hardening.
-- Convergent and additive: keeps legacy CRM/inventory rows and extends their schema.
BEGIN;

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

COMMIT;
