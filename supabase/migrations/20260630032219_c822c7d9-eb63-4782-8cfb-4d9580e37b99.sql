
-- role_permissions: which permission keys each role grants
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permission)
);

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Super admins manage permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- audit_logs: change history on critical tables
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_table_created_idx ON public.audit_logs (table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON public.audit_logs (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- user_activity: lightweight activity events
CREATE TABLE IF NOT EXISTS public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_activity_user_idx ON public.user_activity (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_activity_event_idx ON public.user_activity (event_type, created_at DESC);

GRANT SELECT, INSERT ON public.user_activity TO authenticated;
GRANT ALL ON public.user_activity TO service_role;

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own activity"
  ON public.user_activity FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read their own activity"
  ON public.user_activity FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins read all activity"
  ON public.user_activity FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- has_permission(uid, permission_key)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.permission = _permission
  );
$$;

REVOKE ALL ON FUNCTION public.has_permission(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;

-- Generic audit trigger
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE((CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END)::text, NULL),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Never block business operations on audit failure
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach audit triggers to critical tables
DROP TRIGGER IF EXISTS audit_companies ON public.companies;
CREATE TRIGGER audit_companies
  AFTER INSERT OR UPDATE OR DELETE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_listings ON public.listings;
CREATE TRIGGER audit_listings
  AFTER INSERT OR UPDATE OR DELETE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_commissions ON public.commissions;
CREATE TRIGGER audit_commissions
  AFTER INSERT OR UPDATE OR DELETE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_wallets ON public.wallets;
CREATE TRIGGER audit_wallets
  AFTER UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Seed default permissions
INSERT INTO public.role_permissions (role, permission) VALUES
  -- super_admin: all
  ('super_admin','*'),
  -- admin
  ('admin','admin.access'),
  ('admin','admin.users.manage'),
  ('admin','admin.companies.manage'),
  ('admin','admin.listings.manage'),
  ('admin','admin.commissions.manage'),
  ('admin','admin.seed'),
  ('admin','audit.read'),
  -- moderator
  ('moderator','admin.access'),
  ('moderator','admin.listings.manage'),
  ('moderator','admin.companies.review'),
  -- support
  ('support','admin.access'),
  ('support','support.tickets.manage'),
  -- company
  ('company','company.workspace.access'),
  ('company','company.listings.manage'),
  ('company','company.leads.manage'),
  ('company','company.agents.manage'),
  -- factory
  ('factory','company.workspace.access'),
  ('factory','company.listings.manage'),
  ('factory','factory.production.manage'),
  -- service_provider
  ('service_provider','company.workspace.access'),
  ('service_provider','company.listings.manage'),
  -- wholesaler
  ('wholesaler','company.workspace.access'),
  ('wholesaler','company.listings.manage'),
  ('wholesaler','wholesale.manage'),
  -- agent
  ('agent','agent.dashboard.access'),
  ('agent','agent.storefront.manage'),
  ('agent','agent.commissions.view'),
  -- buyer
  ('buyer','buyer.rfq.create'),
  ('buyer','buyer.orders.view'),
  -- customer
  ('customer','buyer.rfq.create'),
  ('customer','buyer.orders.view')
ON CONFLICT (role, permission) DO NOTHING;
