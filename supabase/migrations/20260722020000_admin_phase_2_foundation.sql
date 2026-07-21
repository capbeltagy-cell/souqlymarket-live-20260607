-- Admin Phase 2 schema. Repository-only until explicitly approved for Production.

CREATE TABLE IF NOT EXISTS public.admin_order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.wholesale_orders(id) ON DELETE RESTRICT,
  from_status text,
  to_status text NOT NULL,
  reason text,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_order_status_history_status_chk CHECK (
    to_status IN ('pending_payment','paid','confirmed','processing','ready_to_ship','shipped','delivered','completed','cancelled','disputed','refunded')
  )
);
CREATE INDEX IF NOT EXISTS admin_order_status_history_order_idx
  ON public.admin_order_status_history(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.order_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.wholesale_orders(id) ON DELETE RESTRICT,
  opened_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open',
  reason text NOT NULL,
  details text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  resolution text,
  decision_reason text,
  refund_amount numeric(14,2),
  finance_status text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_disputes_status_chk CHECK (status IN ('open','under_review','waiting_for_buyer','waiting_for_seller','resolved_buyer','resolved_seller','partially_refunded','rejected','closed')),
  CONSTRAINT order_disputes_refund_chk CHECK (refund_amount IS NULL OR refund_amount >= 0),
  CONSTRAINT order_disputes_finance_chk CHECK (finance_status IS NULL OR finance_status IN ('pending_finance','approved','rejected','completed'))
);
CREATE INDEX IF NOT EXISTS order_disputes_order_idx ON public.order_disputes(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_disputes_status_idx ON public.order_disputes(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.dispute_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.order_disputes(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  internal boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dispute_notes_dispute_idx ON public.dispute_notes(dispute_id, created_at);

CREATE TABLE IF NOT EXISTS public.moderation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT moderation_reports_entity_chk CHECK (entity_type IN ('user','company','store','listing','product','review','message','order','tender','rfq')),
  CONSTRAINT moderation_reports_priority_chk CHECK (priority IN ('low','normal','high','critical')),
  CONSTRAINT moderation_reports_status_chk CHECK (status IN ('open','investigating','waiting_for_info','resolved','rejected','escalated'))
);
CREATE INDEX IF NOT EXISTS moderation_reports_queue_idx ON public.moderation_reports(status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_reports_entity_idx ON public.moderation_reports(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.moderation_reports(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  reason text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS moderation_actions_report_idx ON public.moderation_actions(report_id, created_at);

CREATE TABLE IF NOT EXISTS public.moderation_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.moderation_reports(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS moderation_notes_report_idx ON public.moderation_notes(report_id, created_at);

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  deep_link text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_templates_type_chk CHECK (type IN ('info','success','warning','error','order','payment','payout','company','store','moderation','system'))
);

CREATE TABLE IF NOT EXISTS public.notification_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  target_kind text NOT NULL,
  target_id uuid,
  target_role public.app_role,
  target_audience text,
  deep_link text,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_broadcasts_type_chk CHECK (type IN ('info','success','warning','error','order','payment','payout','company','store','moderation','system')),
  CONSTRAINT notification_broadcasts_target_chk CHECK (target_kind IN ('user','company','store','role','broadcast')),
  CONSTRAINT notification_broadcasts_priority_chk CHECK (priority IN ('low','normal','high','critical')),
  CONSTRAINT notification_broadcasts_status_chk CHECK (status IN ('draft','scheduled','processing','sent','cancelled','failed'))
);
CREATE INDEX IF NOT EXISTS notification_broadcasts_schedule_idx ON public.notification_broadcasts(status, scheduled_at);

CREATE TABLE IF NOT EXISTS public.notification_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.notification_broadcasts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (broadcast_id, user_id),
  CONSTRAINT notification_delivery_logs_status_chk CHECK (status IN ('pending','delivered','failed','read'))
);
CREATE INDEX IF NOT EXISTS notification_delivery_logs_user_idx ON public.notification_delivery_logs(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_notes_entity_idx ON public.admin_notes(entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.platform_settings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_id boolean NOT NULL DEFAULT true,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  old_data jsonb,
  new_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_settings_history_created_idx ON public.platform_settings_history(created_at DESC);

ALTER TABLE public.admin_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order history permitted admins" ON public.admin_order_status_history FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'orders.read'));
CREATE POLICY "order history managers" ON public.admin_order_status_history FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid() AND public.has_permission(auth.uid(), 'orders.manage'));
CREATE POLICY "disputes permitted admins" ON public.order_disputes FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'orders.disputes'));
CREATE POLICY "disputes managers" ON public.order_disputes FOR ALL TO authenticated USING (public.has_permission(auth.uid(), 'orders.disputes')) WITH CHECK (public.has_permission(auth.uid(), 'orders.disputes'));
CREATE POLICY "dispute notes permitted admins" ON public.dispute_notes FOR ALL TO authenticated USING (public.has_permission(auth.uid(), 'orders.disputes')) WITH CHECK (author_id = auth.uid() AND public.has_permission(auth.uid(), 'orders.disputes'));
CREATE POLICY "moderation reports readers" ON public.moderation_reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.has_permission(auth.uid(), 'moderation.read'));
CREATE POLICY "moderation reports managers" ON public.moderation_reports FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'moderation.manage')) WITH CHECK (public.has_permission(auth.uid(), 'moderation.manage'));
CREATE POLICY "moderation actions admins" ON public.moderation_actions FOR ALL TO authenticated USING (public.has_permission(auth.uid(), 'moderation.read')) WITH CHECK (actor_id = auth.uid() AND public.has_permission(auth.uid(), 'moderation.manage'));
CREATE POLICY "moderation notes admins" ON public.moderation_notes FOR ALL TO authenticated USING (public.has_permission(auth.uid(), 'moderation.read')) WITH CHECK (author_id = auth.uid() AND public.has_permission(auth.uid(), 'moderation.manage'));
CREATE POLICY "notification templates admins" ON public.notification_templates FOR ALL TO authenticated USING (public.has_permission(auth.uid(), 'notifications.templates')) WITH CHECK (public.has_permission(auth.uid(), 'notifications.templates'));
CREATE POLICY "notification broadcasts admins" ON public.notification_broadcasts FOR ALL TO authenticated USING (public.has_permission(auth.uid(), 'notifications.read')) WITH CHECK (created_by = auth.uid() AND (public.has_permission(auth.uid(), 'notifications.send') OR public.has_permission(auth.uid(), 'notifications.broadcast')));
CREATE POLICY "delivery logs admins" ON public.notification_delivery_logs FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_permission(auth.uid(), 'notifications.read'));
CREATE POLICY "admin notes permitted" ON public.admin_notes FOR ALL TO authenticated USING (public.is_platform_admin(auth.uid())) WITH CHECK (author_id = auth.uid() AND public.is_platform_admin(auth.uid()));
CREATE POLICY "settings history admins" ON public.platform_settings_history FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'settings.manage'));

GRANT SELECT, INSERT ON public.admin_order_status_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.order_disputes TO authenticated;
GRANT SELECT, INSERT ON public.dispute_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.moderation_reports TO authenticated;
GRANT SELECT, INSERT ON public.moderation_actions, public.moderation_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_templates, public.notification_broadcasts TO authenticated;
GRANT SELECT ON public.notification_delivery_logs, public.platform_settings_history TO authenticated;
GRANT SELECT, INSERT ON public.admin_notes TO authenticated;
GRANT ALL ON public.admin_order_status_history, public.order_disputes, public.dispute_notes, public.moderation_reports, public.moderation_actions, public.moderation_notes, public.notification_templates, public.notification_broadcasts, public.notification_delivery_logs, public.admin_notes, public.platform_settings_history TO service_role;

INSERT INTO public.role_permissions(role, permission) VALUES
  ('admin','orders.refund'), ('admin','orders.disputes'),
  ('admin','moderation.read'), ('admin','moderation.manage'), ('admin','moderation.suspend'), ('admin','moderation.restore'),
  ('admin','notifications.read'), ('admin','notifications.send'), ('admin','notifications.broadcast'), ('admin','notifications.templates'),
  ('moderator','orders.disputes'), ('moderator','moderation.read'), ('moderator','moderation.manage'), ('moderator','moderation.suspend'), ('moderator','moderation.restore'),
  ('finance_admin','orders.refund'), ('finance_admin','orders.disputes'),
  ('support_admin','moderation.read'), ('support_admin','notifications.read'), ('support_admin','notifications.send')
ON CONFLICT (role, permission) DO NOTHING;
