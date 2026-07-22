-- Souqly business suite core: CRM, inventory, invoices, sales and purchases.
-- This migration is additive and must be reviewed/backed up before Production use.

CREATE OR REPLACE FUNCTION public.owns_company(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = _company_id AND c.owner_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.owns_company(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owns_company(uuid) TO authenticated;

-- CRM contacts
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  organization text,
  job_title text,
  source text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','blocked')),
  tags text[] NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_contacts_company_idx ON public.crm_contacts(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_contacts_assigned_idx ON public.crm_contacts(assigned_to);

-- CRM leads/deals
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  source text,
  stage text NOT NULL DEFAULT 'new' CHECK (stage IN ('new','contacted','qualified','quotation','negotiation','won','lost')),
  expected_value numeric(14,2) NOT NULL DEFAULT 0 CHECK (expected_value >= 0),
  currency text NOT NULL DEFAULT 'EGP',
  next_follow_up_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_leads_company_stage_idx ON public.crm_leads(company_id, stage, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_leads_follow_up_idx ON public.crm_leads(next_follow_up_at) WHERE next_follow_up_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  activity_type text NOT NULL CHECK (activity_type IN ('note','call','meeting','email','task','status_change')),
  title text NOT NULL,
  body text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (lead_id IS NOT NULL OR contact_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS crm_activities_lead_idx ON public.crm_activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_activities_contact_idx ON public.crm_activities(contact_id, created_at DESC);

-- Inventory
CREATE TABLE IF NOT EXISTS public.inventory_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  sku text NOT NULL,
  barcode text,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'قطعة',
  cost_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  sale_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
  quantity numeric(14,3) NOT NULL DEFAULT 0,
  reserved_quantity numeric(14,3) NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  reorder_point numeric(14,3) NOT NULL DEFAULT 0 CHECK (reorder_point >= 0),
  allow_negative boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, sku),
  CHECK (allow_negative OR quantity >= 0),
  CHECK (reserved_quantity <= GREATEST(quantity, reserved_quantity))
);

CREATE INDEX IF NOT EXISTS inventory_items_company_idx ON public.inventory_items(company_id, is_active, name);
CREATE INDEX IF NOT EXISTS inventory_items_low_stock_idx ON public.inventory_items(company_id, quantity, reorder_point) WHERE is_active;

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  location_id uuid REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  movement_type text NOT NULL CHECK (movement_type IN ('opening','purchase','sale','return_in','return_out','adjustment','transfer_in','transfer_out','reservation','release')),
  quantity_delta numeric(14,3) NOT NULL CHECK (quantity_delta <> 0),
  balance_after numeric(14,3) NOT NULL,
  reference_type text,
  reference_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_movements_item_idx ON public.inventory_movements(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_movements_reference_idx ON public.inventory_movements(reference_type, reference_id);

-- Sales and purchasing documents
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  order_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed','processing','delivered','cancelled','completed')),
  currency text NOT NULL DEFAULT 'EGP',
  subtotal numeric(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_total numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  tax_total numeric(14,2) NOT NULL DEFAULT 0 CHECK (tax_total >= 0),
  total numeric(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  notes text,
  issued_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, order_number)
);

CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  discount numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  tax numeric(14,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  line_total numeric(14,2) NOT NULL CHECK (line_total >= 0)
);

CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  tax_number text,
  address text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS suppliers_company_idx ON public.suppliers(company_id, is_active, name);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  order_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','sent','partially_received','received','cancelled','closed')),
  currency text NOT NULL DEFAULT 'EGP',
  subtotal numeric(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_total numeric(14,2) NOT NULL DEFAULT 0 CHECK (tax_total >= 0),
  total numeric(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  expected_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, order_number)
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  received_quantity numeric(14,3) NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  unit_cost numeric(14,2) NOT NULL CHECK (unit_cost >= 0),
  tax numeric(14,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  line_total numeric(14,2) NOT NULL CHECK (line_total >= 0),
  CHECK (received_quantity <= quantity)
);

-- Invoices
CREATE TABLE IF NOT EXISTS public.business_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  invoice_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','partially_paid','paid','overdue','cancelled','refunded')),
  currency text NOT NULL DEFAULT 'EGP',
  subtotal numeric(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_total numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  tax_total numeric(14,2) NOT NULL DEFAULT 0 CHECK (tax_total >= 0),
  shipping_total numeric(14,2) NOT NULL DEFAULT 0 CHECK (shipping_total >= 0),
  total numeric(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  paid_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  due_date date,
  issued_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, invoice_number),
  CHECK (paid_amount <= total)
);

CREATE TABLE IF NOT EXISTS public.business_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.business_invoices(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  discount numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  tax numeric(14,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  line_total numeric(14,2) NOT NULL CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS sales_orders_company_idx ON public.sales_orders(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS purchase_orders_company_idx ON public.purchase_orders(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS business_invoices_company_idx ON public.business_invoices(company_id, status, created_at DESC);

-- RLS: company owners manage their own business data; admins retain platform oversight.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'crm_contacts','crm_leads','crm_activities','inventory_locations','inventory_items',
    'inventory_movements','sales_orders','suppliers','purchase_orders','business_invoices'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_company_access', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.owns_company(company_id) OR public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.owns_company(company_id) OR public.has_role(auth.uid(), ''admin''))',
      table_name || '_company_access', table_name
    );
  END LOOP;
END $$;

ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sales_order_items_company_access ON public.sales_order_items;
CREATE POLICY sales_order_items_company_access ON public.sales_order_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.sales_orders o WHERE o.id = sales_order_id AND (public.owns_company(o.company_id) OR public.has_role(auth.uid(),'admin'))))
WITH CHECK (EXISTS (SELECT 1 FROM public.sales_orders o WHERE o.id = sales_order_id AND (public.owns_company(o.company_id) OR public.has_role(auth.uid(),'admin'))));

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS purchase_order_items_company_access ON public.purchase_order_items;
CREATE POLICY purchase_order_items_company_access ON public.purchase_order_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.purchase_orders o WHERE o.id = purchase_order_id AND (public.owns_company(o.company_id) OR public.has_role(auth.uid(),'admin'))))
WITH CHECK (EXISTS (SELECT 1 FROM public.purchase_orders o WHERE o.id = purchase_order_id AND (public.owns_company(o.company_id) OR public.has_role(auth.uid(),'admin'))));

ALTER TABLE public.business_invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS business_invoice_items_company_access ON public.business_invoice_items;
CREATE POLICY business_invoice_items_company_access ON public.business_invoice_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.business_invoices i WHERE i.id = invoice_id AND (public.owns_company(i.company_id) OR public.has_role(auth.uid(),'admin'))))
WITH CHECK (EXISTS (SELECT 1 FROM public.business_invoices i WHERE i.id = invoice_id AND (public.owns_company(i.company_id) OR public.has_role(auth.uid(),'admin'))));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contacts, public.crm_leads, public.crm_activities,
  public.inventory_locations, public.inventory_items, public.inventory_movements,
  public.sales_orders, public.sales_order_items, public.suppliers, public.purchase_orders,
  public.purchase_order_items, public.business_invoices, public.business_invoice_items TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
