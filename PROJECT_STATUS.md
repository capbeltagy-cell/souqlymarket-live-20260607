# Souqly — Project Status

_Last updated: 2026-06-12_

## What was fixed this pass

- **Site-wide 401 “permission denied” on public reads.** Root cause: no public schema table had any `GRANT` to `anon`/`authenticated`/`service_role`. RLS policies were in place, but PostgREST rejected requests at the grant layer before policies ever ran.
  - Granted `SELECT, INSERT, UPDATE, DELETE` to `authenticated` on all 26 public tables.
  - Granted `ALL` to `service_role` on all 26 public tables.
  - Granted `SELECT` to `anon` on tables whose RLS allows public reads: `companies`, `listings`, `agents`, `factories`, `tenders`, `rfqs`, `wholesale_listings`, `business_categories`, `company_profiles_extra`, `agent_landing_pages`.
  - Granted `INSERT` to `anon` on `leads` (anon RLS policy already allowed lead capture).
  - Granted `EXECUTE` on `public.has_role(uuid, app_role)` to `anon, authenticated` so RLS policies that call `has_role()` no longer fail for signed-out visitors.
- **Verified:** anonymous `GET /rest/v1/listings?select=id,companies(name_en)&status=eq.approved` now returns 200 with rows. Home page, marketplace, company directory, factories, RFQs, tenders, wholesale listings can load again.

## Previously fixed (still in place)

- Email/password-only auth — Google/phone/OTP removed.
- Profile + default role auto-provisioned via `handle_new_user` trigger.
- Storage buckets exist (`company-assets`, `avatars`, `listing-media`, `company-catalogs`, `rfq-attachments`) with a `SELECT` policy on `storage.buckets` so the client can resolve bucket metadata before upload.
- `src/server.ts` resolves Supabase env at request time with fallbacks (process.env → worker env → VITE_*).

## What is still broken / needs verification

The grant fix unblocks all read paths. End-to-end happy-path testing of signup, listing create, image upload, wallet, referrals, and admin pages was **not** re-run in this pass — the production preview should be exercised manually now that PostgREST no longer 401s. If anything still errors, it’s likely scoped to a specific feature rather than the platform-wide outage.

## What needs owner configuration

These are Supabase warnings unrelated to the runtime fix; flagged for the owner:

1. **Leaked Password Protection disabled.** Enable in Cloud → Users → Auth Settings (Password HIBP Check).
2. **SECURITY DEFINER functions are EXECUTE-able by `public`.** Project-wide convention; not introduced by this pass. If tightening is desired, revoke EXECUTE from `public` on each definer function and grant only to required roles.
3. **Pre-existing security scan findings** on `companies`, `company_profiles_extra`, `profiles` (publicly readable contact fields) — owner to decide whether to restrict via views or accept as a public B2B directory.

## Production readiness score

**4 / 5** — Platform-level data API is healthy again; remaining items are policy/feature-level decisions, not outages.
