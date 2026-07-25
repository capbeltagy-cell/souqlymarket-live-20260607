# Souqly Business Solutions — ERP Sprint 1 Handoff

## Migration order

Apply these files in timestamp order on a staging project before Production:

1. `20260723110000_company_workspace_members.sql`
   - Adds company members and invitation records.
   - Adds server-side membership and permission helpers.
   - Backfills each existing company owner as an `owner` member.
2. `20260723113000_company_crm_inventory.sql`
   - Extends the existing `leads` table with CRM fields.
   - Reuses `listings` as the product/inventory source of truth.
   - Adds CRM activities, inventory locations, movements and an atomic stock adjustment function.
3. `20260723120000_company_invitation_acceptance.sql`
   - Adds hashed, email-bound invitation acceptance.

4. `20260725190000_permission_wildcard.sql`
   - Makes the existing `super_admin` role satisfy legacy admin checks.
   - Honors the existing `*` role permission in server-side permission checks.

For the release, apply the reviewed, consolidated `supabase/launch_bundle.sql`
instead of running these files one by one. Then run `supabase/verify_launch.sql`
and `supabase/tests/company_erp_sprint_1.sql` in a staging or disposable database.

## Safety and data impact

- All schema changes are additive. No application table or column is dropped.
- Existing company owners are inserted into `company_members` with `ON CONFLICT`; no company ownership is changed.
- Existing leads and listings remain the CRM and product sources of truth.
- Stock changes use `adjust_company_inventory` with a row lock, permission check and non-negative balance check.
- Invitation tokens are stored only as SHA-256 hashes and acceptance verifies the authenticated email.
- RLS policies extend existing owner access; they do not remove current policies.

## Manual review before Production

- Take a database backup and apply to staging first.
- Confirm every company `owner_id` still references an active account.
- Confirm the current `leads.status` constraint includes `negotiating` (the existing migration history already adds it).
- Review whether non-owner `admin` members should be permitted to invite other admins; Sprint 1 currently allows this.
- Regenerate `src/integrations/supabase/types.ts` after applying migrations, then replace the temporary local ERP table typing.

## Local verification status

- Application TypeScript, ESLint and production Node build pass.
- SQL catalog assertions are included in `supabase/tests/company_erp_sprint_1.sql`.
- Supabase local reset was not executable in this workspace because Docker is not installed. No Production connection or migration command was attempted.
- `supabase/launch_bundle.sql` is transaction-wrapped, dependency-guarded, additive,
  and uses convergent policy/trigger replacement so it can be safely reviewed and
  rerun after a successful baseline deployment.
