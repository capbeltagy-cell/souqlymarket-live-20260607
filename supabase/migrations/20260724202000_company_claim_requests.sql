-- Company page claim requests
create table if not exists public.company_claim_requests (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.company_prospects(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  requester_name text not null,
  requester_phone text,
  requester_email text,
  job_title text,
  evidence_url text,
  note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  unique (prospect_id, requester_id)
);

alter table public.company_claim_requests enable row level security;

create policy "users create own claim requests"
on public.company_claim_requests for insert to authenticated
with check (requester_id = auth.uid());

create policy "users read own claim requests"
on public.company_claim_requests for select to authenticated
using (requester_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "admins manage claim requests"
on public.company_claim_requests for update to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create index if not exists company_claim_requests_status_idx
on public.company_claim_requests(status, created_at desc);

comment on table public.company_claim_requests is 'Ownership requests for imported company prospect pages.';