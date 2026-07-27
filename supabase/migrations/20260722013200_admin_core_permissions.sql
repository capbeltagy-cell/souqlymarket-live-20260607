-- Phase 1 permission catalogue and restrictive administrative read policies.
INSERT INTO public.role_permissions (role, permission) VALUES
  ('super_admin', '*'),
  ('admin', 'users.read'),
  ('admin', 'users.manage'),
  ('admin', 'companies.read'),
  ('admin', 'companies.manage'),
  ('admin', 'stores.read'),
  ('admin', 'stores.manage'),
  ('admin', 'listings.moderate'),
  ('admin', 'orders.read'),
  ('admin', 'orders.manage'),
  ('admin', 'payments.read'),
  ('admin', 'payments.manage'),
  ('admin', 'payouts.manage'),
  ('admin', 'settings.manage'),
  ('admin', 'audit.read'),
  ('admin', 'notifications.manage'),
  ('moderator', 'companies.read'),
  ('moderator', 'stores.read'),
  ('moderator', 'listings.moderate'),
  ('moderator', 'audit.read'),
  ('finance_admin', 'orders.read'),
  ('finance_admin', 'payments.read'),
  ('finance_admin', 'payments.manage'),
  ('finance_admin', 'payouts.manage'),
  ('finance_admin', 'audit.read'),
  ('support_admin', 'users.read'),
  ('support_admin', 'companies.read'),
  ('support_admin', 'stores.read')
ON CONFLICT (role, permission) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated can read permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Platform admins read permissions" ON public.role_permissions;
CREATE POLICY "Platform admins read permissions"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Platform admins read audit logs" ON public.audit_logs;
CREATE POLICY "Platform admins read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_permission(auth.uid(), 'audit.read')
  );

REVOKE DELETE, UPDATE ON public.audit_logs FROM authenticated;

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS maintenance_mode boolean NOT NULL DEFAULT false;
