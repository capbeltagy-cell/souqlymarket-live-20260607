create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,49}$'),
  name_ar text not null check (char_length(name_ar) between 2 and 120),
  name_en text,
  description_ar text,
  description_en text,
  logo_url text,
  banner_url text,
  primary_color text not null default '#0f766e',
  accent_color text not null default '#f59e0b',
  status text not null default 'pending_review' check (status in ('draft','pending_review','published','suspended')),
  is_featured boolean not null default false,
  contact_phone text,
  whatsapp text,
  city text,
  governorate text,
  shipping_policy text,
  return_policy text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stores_status_idx on public.stores(status);
create index if not exists stores_company_id_idx on public.stores(company_id);

alter table public.stores enable row level security;

drop policy if exists "Public can view published stores" on public.stores;
create policy "Public can view published stores"
on public.stores for select
to anon, authenticated
using (
  status = 'published'
  or exists (
    select 1 from public.companies c
    where c.id = stores.company_id and c.owner_id = auth.uid()
  )
  or public.has_role(auth.uid(), 'admin')
);

drop policy if exists "Company owners create store" on public.stores;
create policy "Company owners create store"
on public.stores for insert
to authenticated
with check (
  exists (
    select 1 from public.companies c
    where c.id = stores.company_id and c.owner_id = auth.uid()
  )
);

drop policy if exists "Company owners update store" on public.stores;
create policy "Company owners update store"
on public.stores for update
to authenticated
using (
  exists (
    select 1 from public.companies c
    where c.id = stores.company_id and c.owner_id = auth.uid()
  ) or public.has_role(auth.uid(), 'admin')
)
with check (
  exists (
    select 1 from public.companies c
    where c.id = stores.company_id and c.owner_id = auth.uid()
  ) or public.has_role(auth.uid(), 'admin')
);

create or replace function public.protect_store_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.has_role(auth.uid(), 'admin') then
    new.is_featured := old.is_featured;
    if old.status in ('published','suspended') then
      new.status := old.status;
    elsif new.status not in ('draft','pending_review') then
      new.status := 'pending_review';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists protect_store_admin_fields_trg on public.stores;
create trigger protect_store_admin_fields_trg
before update on public.stores
for each row execute function public.protect_store_admin_fields();
