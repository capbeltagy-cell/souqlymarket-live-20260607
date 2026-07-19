create table if not exists public.store_coupons (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  code text not null,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  minimum_order_amount numeric(12,2) not null default 0 check (minimum_order_amount >= 0),
  maximum_discount_amount numeric(12,2),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  used_count integer not null default 0 check (used_count >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, code),
  check (discount_type <> 'percentage' or discount_value <= 100),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

alter table public.store_coupons enable row level security;

create policy "Store owners manage own coupons"
on public.store_coupons for all to authenticated
using (exists (
  select 1 from public.stores s
  join public.companies c on c.id = s.company_id
  where s.id = store_coupons.store_id and c.owner_id = auth.uid()
))
with check (exists (
  select 1 from public.stores s
  join public.companies c on c.id = s.company_id
  where s.id = store_coupons.store_id and c.owner_id = auth.uid()
));

create policy "Admins manage store coupons"
on public.store_coupons for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

alter table public.wholesale_orders
  add column if not exists coupon_code text,
  add column if not exists discount_amount numeric(12,2) not null default 0,
  add column if not exists subtotal_amount numeric(12,2);

create or replace function public.touch_store_coupon_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists store_coupons_touch_updated_at on public.store_coupons;
create trigger store_coupons_touch_updated_at
before update on public.store_coupons
for each row execute function public.touch_store_coupon_updated_at();
