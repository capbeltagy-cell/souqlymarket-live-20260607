-- Souqly business suite: sales and purchases
-- Keep unapplied until the final Supabase rollout.

create table if not exists public.business_suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 180),
  contact_name text,
  email text,
  phone text,
  address text,
  status text not null default 'active' check (status in ('active','inactive','blocked')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_sales_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  order_number text not null,
  status text not null default 'draft' check (status in ('draft','confirmed','processing','completed','cancelled')),
  order_date date not null default current_date,
  currency text not null default 'EGP',
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  tax numeric(14,2) not null default 0 check (tax >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, order_number)
);

create table if not exists public.business_sales_order_items (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references public.business_sales_orders(id) on delete cascade,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  description text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  line_total numeric(14,2) generated always as (round((quantity * unit_price)::numeric, 2)) stored
);

create table if not exists public.business_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_id uuid references public.business_suppliers(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  order_number text not null,
  status text not null default 'draft' check (status in ('draft','approved','ordered','partially_received','received','cancelled')),
  order_date date not null default current_date,
  expected_date date,
  currency text not null default 'EGP',
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  tax numeric(14,2) not null default 0 check (tax >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, order_number)
);

create table if not exists public.business_purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.business_purchase_orders(id) on delete cascade,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  description text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  received_quantity numeric(14,3) not null default 0 check (received_quantity >= 0 and received_quantity <= quantity),
  unit_cost numeric(14,2) not null check (unit_cost >= 0),
  line_total numeric(14,2) generated always as (round((quantity * unit_cost)::numeric, 2)) stored
);

create index if not exists business_suppliers_company_idx on public.business_suppliers(company_id, created_at desc);
create index if not exists business_sales_orders_company_idx on public.business_sales_orders(company_id, created_at desc);
create index if not exists business_purchase_orders_company_idx on public.business_purchase_orders(company_id, created_at desc);

alter table public.business_suppliers enable row level security;
alter table public.business_sales_orders enable row level security;
alter table public.business_sales_order_items enable row level security;
alter table public.business_purchase_orders enable row level security;
alter table public.business_purchase_order_items enable row level security;

create policy "company manages suppliers" on public.business_suppliers for all to authenticated
using (public.owns_company(company_id) or public.has_role(auth.uid(),'admin'))
with check (public.owns_company(company_id) or public.has_role(auth.uid(),'admin'));

create policy "company manages sales orders" on public.business_sales_orders for all to authenticated
using (public.owns_company(company_id) or public.has_role(auth.uid(),'admin'))
with check (public.owns_company(company_id) or public.has_role(auth.uid(),'admin'));

create policy "company manages sales order items" on public.business_sales_order_items for all to authenticated
using (exists(select 1 from public.business_sales_orders o where o.id = sales_order_id and (public.owns_company(o.company_id) or public.has_role(auth.uid(),'admin'))))
with check (exists(select 1 from public.business_sales_orders o where o.id = sales_order_id and (public.owns_company(o.company_id) or public.has_role(auth.uid(),'admin'))));

create policy "company manages purchase orders" on public.business_purchase_orders for all to authenticated
using (public.owns_company(company_id) or public.has_role(auth.uid(),'admin'))
with check (public.owns_company(company_id) or public.has_role(auth.uid(),'admin'));

create policy "company manages purchase order items" on public.business_purchase_order_items for all to authenticated
using (exists(select 1 from public.business_purchase_orders o where o.id = purchase_order_id and (public.owns_company(o.company_id) or public.has_role(auth.uid(),'admin'))))
with check (exists(select 1 from public.business_purchase_orders o where o.id = purchase_order_id and (public.owns_company(o.company_id) or public.has_role(auth.uid(),'admin'))));

grant select, insert, update, delete on public.business_suppliers, public.business_sales_orders, public.business_sales_order_items, public.business_purchase_orders, public.business_purchase_order_items to authenticated;
grant all on public.business_suppliers, public.business_sales_orders, public.business_sales_order_items, public.business_purchase_orders, public.business_purchase_order_items to service_role;
