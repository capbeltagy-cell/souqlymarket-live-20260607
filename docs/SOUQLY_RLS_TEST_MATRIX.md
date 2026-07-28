# Souqly RLS Test Matrix

No RLS write test was executed against Supabase Production. An isolated test project was not available.

| Role | Critical tables | Select | Insert | Update | Delete | Status |
|---|---|---:|---:|---:|---:|---|
| Anonymous | profiles, companies, stores, listings, agents | Not runtime-tested | N/A | N/A | N/A | BLOCKED |
| Authenticated | profiles, companies, stores, listings, leads | Not runtime-tested | Not runtime-tested | Not runtime-tested | Not runtime-tested | BLOCKED |
| Company | companies, stores, listings, orders, leads | Not runtime-tested | Not runtime-tested | Not runtime-tested | Not runtime-tested | BLOCKED |
| Marketer | agents, referrals, commissions, payouts | Not runtime-tested | Not runtime-tested | Not runtime-tested | Not runtime-tested | BLOCKED |
| Admin | moderation, payments, notifications, audit tables | Not runtime-tested | Not runtime-tested | Not runtime-tested | Not runtime-tested | BLOCKED |

## Verified in code and tests

- Admin server functions require authenticated context and role checks.
- Super-admin no longer grants an admin role during an authorization check.
- Generic caller-selected hard deletion was removed.
- Moderation listing removal now changes status to `rejected` instead of deleting the row.
- The public agent projection excludes phone and commission data.

## Release requirement

Create a disposable Supabase test project, apply repository migrations there, seed dedicated test identities for every role, then execute the full Role × Table × Operation matrix before Production migration approval.
