-- Souqly ERP Sprint 1: additive CRM and inventory foundation.
-- Reuses public.leads and public.listings; no parallel product/customer system.

BEGIN;

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
    CHECK (movement_type IN ('opening', 'adjustment', 'purchase', 'sale', 'return', 'transfer_in', 'transfer_out')),
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

-- Extend existing owner-only access without replacing the current policies.
CREATE POLICY "leads_company_members_read" ON public.leads
  FOR SELECT TO authenticated
  USING (public.has_company_permission(company_id, 'crm.view', auth.uid()));
CREATE POLICY "leads_company_members_update" ON public.leads
  FOR UPDATE TO authenticated
  USING (public.has_company_permission(company_id, 'crm.manage', auth.uid()))
  WITH CHECK (public.has_company_permission(company_id, 'crm.manage', auth.uid()));
CREATE POLICY "listings_inventory_members_read" ON public.listings
  FOR SELECT TO authenticated
  USING (
    type = 'product'
    AND public.has_company_permission(company_id, 'inventory.view', auth.uid())
  );

CREATE POLICY "crm_activities_company_read" ON public.crm_activities
  FOR SELECT TO authenticated
  USING (public.has_company_permission(company_id, 'crm.view', auth.uid()));
CREATE POLICY "crm_activities_company_insert" ON public.crm_activities
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND public.has_company_permission(company_id, 'crm.manage', auth.uid())
    AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.company_id = company_id)
  );
CREATE POLICY "crm_activities_company_update" ON public.crm_activities
  FOR UPDATE TO authenticated
  USING (actor_id = auth.uid() AND public.has_company_permission(company_id, 'crm.manage', auth.uid()))
  WITH CHECK (actor_id = auth.uid() AND public.has_company_permission(company_id, 'crm.manage', auth.uid()));

CREATE POLICY "inventory_locations_company_read" ON public.inventory_locations
  FOR SELECT TO authenticated
  USING (public.has_company_permission(company_id, 'inventory.view', auth.uid()));
CREATE POLICY "inventory_locations_company_manage" ON public.inventory_locations
  FOR ALL TO authenticated
  USING (public.has_company_permission(company_id, 'inventory.manage', auth.uid()))
  WITH CHECK (
    created_by = auth.uid()
    AND public.has_company_permission(company_id, 'inventory.manage', auth.uid())
  );

CREATE POLICY "inventory_movements_company_read" ON public.inventory_movements
  FOR SELECT TO authenticated
  USING (public.has_company_permission(company_id, 'inventory.view', auth.uid()));
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
GRANT ALL ON public.crm_activities, public.inventory_locations, public.inventory_movements TO service_role;

-- Atomic adjustment: server supplies only product and delta; ownership and final balance
-- are resolved inside the database transaction under the caller's identity.
CREATE OR REPLACE FUNCTION public.adjust_company_inventory(
  _listing_id uuid,
  _quantity_delta integer,
  _note text DEFAULT NULL,
  _location_id uuid DEFAULT NULL
)
RETURNS integer
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
  ) THEN RAISE EXCEPTION 'invalid_inventory_location'; END IF;

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

REVOKE ALL ON FUNCTION public.adjust_company_inventory(uuid, integer, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_company_inventory(uuid, integer, text, uuid)
  TO authenticated, service_role;

COMMIT;
