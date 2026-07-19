create table if not exists public.store_categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name_ar text not null check (char_length(name_ar) between 2 and 80),
  name_en text,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(store_id, slug)
);

create table if not exists public.store_listing_settings (
  store_id uuid not null references public.stores(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  category_id uuid references public.store_categories(id) on delete set null,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (store_id, listing_id)
);

create index if not exists store_categories_store_sort_idx on public.store_categories(store_id, sort_order, created_at);
create index if not exists store_listing_settings_store_sort_idx on public.store_listing_settings(store_id, is_featured desc, sort_order);

alter table public.store_categories enable row level security;
alter table public.store_listing_settings enable row level security;

create policy "Published store categories are public"
on public.store_categories for select
to anon, authenticated
using (
  is_active and exists (
    select 1 from public.stores s where s.id = store_id and s.status = 'published'
  )
);

create policy "Store owners manage categories"
on public.store_categories for all
to authenticated
using (
  exists (
    select 1 from public.stores s
    join public.companies c on c.id = s.company_id
    where s.id = store_id and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.stores s
    join public.companies c on c.id = s.company_id
    where s.id = store_id and c.owner_id = auth.uid()
  )
);

create policy "Published store listing settings are public"
on public.store_listing_settings for select
to anon, authenticated
using (
  is_visible and exists (
    select 1 from public.stores s where s.id = store_id and s.status = 'published'
  )
);

create policy "Store owners manage listing settings"
on public.store_listing_settings for all
to authenticated
using (
  exists (
    select 1 from public.stores s
    join public.companies c on c.id = s.company_id
    where s.id = store_id and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.stores s
    join public.companies c on c.id = s.company_id
    join public.listings l on l.id = listing_id and l.company_id = c.id
    where s.id = store_id and c.owner_id = auth.uid()
  )
);
