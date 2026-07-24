-- Souqly company prospecting CRM
create extension if not exists pgcrypto;

create table if not exists public.company_prospects (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text,
  industry text,
  governorate text,
  city text,
  industrial_zone text,
  website text,
  email text,
  phone text,
  whatsapp text,
  facebook_url text,
  linkedin_url text,
  description text,
  source_name text,
  source_url text,
  contact_person text,
  contact_status text not null default 'new' check (contact_status in ('new','not_contacted','whatsapp_sent','email_sent','called','interested','follow_up','joined','rejected','invalid')),
  assigned_to uuid references auth.users(id) on delete set null,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  notes text,
  claimed_company_id uuid references public.companies(id) on delete set null,
  claimed_at timestamptz,
  is_published boolean not null default false,
  data_quality_score smallint not null default 0 check (data_quality_score between 0 and 100),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists company_prospects_email_unique
  on public.company_prospects (lower(email)) where email is not null and email <> '';
create unique index if not exists company_prospects_phone_unique
  on public.company_prospects (phone) where phone is not null and phone <> '';
create index if not exists company_prospects_status_idx on public.company_prospects(contact_status);
create index if not exists company_prospects_location_idx on public.company_prospects(governorate, city);
create index if not exists company_prospects_follow_up_idx on public.company_prospects(next_follow_up_at);

create table if not exists public.company_prospect_activities (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.company_prospects(id) on delete cascade,
  activity_type text not null check (activity_type in ('note','whatsapp','email','call','status_change','follow_up','claim')),
  details text,
  old_status text,
  new_status text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists company_prospect_activities_prospect_idx
  on public.company_prospect_activities(prospect_id, created_at desc);

alter table public.company_prospects enable row level security;
alter table public.company_prospect_activities enable row level security;

create policy "admins manage company prospects"
on public.company_prospects for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "admins manage prospect activities"
on public.company_prospect_activities for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.touch_company_prospect_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_company_prospects_updated_at on public.company_prospects;
create trigger trg_company_prospects_updated_at
before update on public.company_prospects
for each row execute function public.touch_company_prospect_updated_at();

comment on table public.company_prospects is 'Admin-only CRM database for Egyptian company outreach and onboarding.';
comment on column public.company_prospects.is_published is 'Only publish after data review and source/legal checks.';
