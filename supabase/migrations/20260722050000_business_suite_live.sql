-- Souqly business suite: CRM, inventory and invoices
-- Safe to keep unapplied until the final Supabase rollout.

create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  email text,
  phone text,
  organization text,
  status text not null default 'active' check (status in ('active','inactive','blocked')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  contact_id uuid references public.crm_contacts(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  activity_type text not null check (activity_type in ('call','message','meeting','note','task')),
  subject text not null check (char_length(trim(subject)) between 2 and 200),
  details text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  name text not null check (char_length(trim(name)) between 2 and 200),
  sku text,
  barcode text,
  quantity numeric(14,3) not null default 0 check (quantity >= 0),
  reserved_quantity numeric(14,3) not null default 0 check (reserved_quantity >= 0),
  minimum_quantity numeric(14,3) not null default 0 check (minimum_quantity >= 0),
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  currency text not null default 'EGP',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, sku)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  movement_type text not null check (movement_type in ('opening','purchase','sale','return','adjustment_in','adjustment_out')),
  quantity numeric(14,3) not null check (quantity > 0),
  reference_type text,
  reference_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.business_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  invoice_number text not null,
  status text not null default 'draft' check (status in ('draft','issued','partially_paid','paid','overdue','cancelled')),
  issue_date date not null default current_date,
  due_date date,
  currency text not null default 'EGP',
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  tax numeric(14,2) not null default 0 check (tax >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, invoice_number),
  check (paid_amount <= total)
);

create table if not exists public.business_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.business_invoices(id) on delete cascade,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  description text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  line_total numeric(14,2) generated always as (round((quantity * unit_price)::numeric, 2)) stored
);

create index if not exists crm_contacts_company_idx on public.crm_contacts(company_id, created_at desc);
create index if not exists crm_activities_company_idx on public.crm_activities(company_id, created_at desc);
create index if not exists inventory_items_company_idx on public.inventory_items(company_id, is_active);
create index if not exists inventory_movements_item_idx on public.inventory_movements(item_id, created_at desc);
create index if not exists business_invoices_company_idx on public.business_invoices(company_id, created_at desc);

alter table public.crm_contacts enable row level security;
alter table public.crm_activities enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.business_invoices enable row level security;
alter table public.business_invoice_items enable row level security;

create or replace function public.owns_company(target_company_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.companies c where c.id = target_company_id and c.owner_id = auth.uid()) $$;

revoke all on function public.owns_company(uuid) from public;
grant execute on function public.owns_company(uuid) to authenticated;

create policy "company manages crm contacts" on public.crm_contacts for all to authenticated
using (public.owns_company(company_id) or public.has_role(auth.uid(),'admin'))
with check (public.owns_company(company_id) or public.has_role(auth.uid(),'admin'));

create policy "company manages crm activities" on public.crm_activities for all to authenticated
using (public.owns_company(company_id) or public.has_role(auth.uid(),'admin'))
with check (public.owns_company(company_id) or public.has_role(auth.uid(),'admin'));

create policy "company manages inventory items" on public.inventory_items for all to authenticated
using (public.owns_company(company_id) or public.has_role(auth.uid(),'admin'))
with check (public.owns_company(company_id) or public.has_role(auth.uid(),'admin'));

create policy "company manages inventory movements" on public.inventory_movements for all to authenticated
using (public.owns_company(company_id) or public.has_role(auth.uid(),'admin'))
with check (public.owns_company(company_id) or public.has_role(auth.uid(),'admin'));

create policy "company manages business invoices" on public.business_invoices for all to authenticated
using (public.owns_company(company_id) or public.has_role(auth.uid(),'admin'))
with check (public.owns_company(company_id) or public.has_role(auth.uid(),'admin'));

create policy "company manages business invoice items" on public.business_invoice_items for all to authenticated
using (exists(select 1 from public.business_invoices i where i.id = invoice_id and (public.owns_company(i.company_id) or public.has_role(auth.uid(),'admin'))))
with check (exists(select 1 from public.business_invoices i where i.id = invoice_id and (public.owns_company(i.company_id) or public.has_role(auth.uid(),'admin'))));

grant select, insert, update, delete on public.crm_contacts, public.crm_activities, public.inventory_items, public.inventory_movements, public.business_invoices, public.business_invoice_items to authenticated;
grant all on public.crm_contacts, public.crm_activities, public.inventory_items, public.inventory_movements, public.business_invoices, public.business_invoice_items to service_role;
