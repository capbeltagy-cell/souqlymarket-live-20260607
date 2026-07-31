-- Souqly ERP Sprint 1: company workspace membership and permissions.
-- Safe, additive migration. It does not modify or delete production records.

BEGIN;

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

-- SECURITY DEFINER helpers avoid recursive RLS checks on company_members.
CREATE OR REPLACE FUNCTION public.is_company_member(_company_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
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
)
RETURNS boolean
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
          'workspace.view', 'crm.view', 'crm.manage', 'inventory.view', 'inventory.manage',
          'members.view'
        ]))
        OR (cm.role = 'sales' AND _permission = ANY(ARRAY['workspace.view', 'crm.view', 'crm.manage']))
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

-- Preserve the canonical owner as a workspace member for new and existing companies.
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

DROP TRIGGER IF EXISTS trg_sync_company_owner_membership ON public.companies;
CREATE TRIGGER trg_sync_company_owner_membership
AFTER INSERT OR UPDATE OF owner_id ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.sync_company_owner_membership();

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_members_workspace_read"
  ON public.company_members FOR SELECT TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "company_members_admin_insert"
  ON public.company_members FOR INSERT TO authenticated
  WITH CHECK (public.has_company_permission(company_id, 'members.manage', auth.uid()));
CREATE POLICY "company_members_admin_update"
  ON public.company_members FOR UPDATE TO authenticated
  USING (public.has_company_permission(company_id, 'members.manage', auth.uid()) AND role <> 'owner')
  WITH CHECK (public.has_company_permission(company_id, 'members.manage', auth.uid()) AND role <> 'owner');
CREATE POLICY "company_members_admin_delete"
  ON public.company_members FOR DELETE TO authenticated
  USING (public.has_company_permission(company_id, 'members.manage', auth.uid()) AND role <> 'owner');

CREATE POLICY "company_invitations_workspace_read"
  ON public.company_invitations FOR SELECT TO authenticated
  USING (public.has_company_permission(company_id, 'members.view', auth.uid()));
CREATE POLICY "company_invitations_admin_insert"
  ON public.company_invitations FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND public.has_company_permission(company_id, 'members.manage', auth.uid())
  );
CREATE POLICY "company_invitations_admin_update"
  ON public.company_invitations FOR UPDATE TO authenticated
  USING (public.has_company_permission(company_id, 'members.manage', auth.uid()))
  WITH CHECK (public.has_company_permission(company_id, 'members.manage', auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.company_invitations TO authenticated;
GRANT ALL ON public.company_members, public.company_invitations TO service_role;

COMMIT;
