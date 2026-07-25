# Souqly — Project Status

_Last updated: 2026-07-25_

## Current release branch

`feature/business-solutions-erp-sprint-1`

The application code and database release files are prepared locally. Nothing in
this Sprint has been applied to the Production Supabase project or merged to
`main`.

## Ready in code

- Persisted role-based route guards for admin, company, store, marketer, and
  customer entry points.
- Company Workspace membership, invitations, scoped permissions, CRM activities,
  inventory locations, inventory movements, and atomic stock adjustments.
- Existing `leads` and `listings` remain the CRM and inventory sources of truth;
  no parallel product/customer system was created.
- Secure invitation acceptance uses SHA-256 token hashes and verifies the signed-in
  email.
- Super-admin compatibility and wildcard permission handling are enforced by
  database functions.
- Store product creation is preserved on
  `feature/store-production-readiness-sprint-1` at commit `c10bf8f`.
- Coolify Node-server build, start command, port 3000, and `/health` endpoint are
  configured.
- Consolidated release, verification, and rollback files are present:
  `supabase/launch_bundle.sql`, `supabase/verify_launch.sql`, and
  `supabase/rollback_notes.md`.

## Required before Production

1. Push the local feature branches when GitHub credentials are available and open
   reviewed pull requests. Do not merge automatically.
2. Apply `supabase/launch_bundle.sql` to a staging clone, then run
   `supabase/verify_launch.sql` and
   `supabase/tests/company_erp_sprint_1.sql`.
3. Take a Production backup, apply the reviewed bundle, verify it, then deploy the
   matching Coolify image and complete the post-deployment tests in
   `DEPLOYMENT_CHECKLIST.md`.

## Known blockers and risks

- Docker is not installed in this workspace, so `supabase start`,
  `supabase db reset`, migration listing, Docker image build, and local SQL
  execution could not be performed here.
- GitHub HTTPS credentials are unavailable in this environment, so local commits
  cannot currently be pushed.
- Production data and authentication journeys have intentionally not been mutated
  or exercised from this workspace.
- The application build still reports a non-failing main-bundle size warning; it
  does not block the Node build but remains a performance follow-up.

## Latest local quality gate

Run on 2026-07-25 from this branch:

- `npm run typecheck`: passed.
- `npm run lint`: passed with zero errors and 339 pre-existing warnings.
- `NITRO_PRESET=node-server npm run build`: passed.
- Built Node server startup: passed.
- `GET /health`: returned JSON status `ok`.
- `HEAD /health`: returned HTTP 204.
- Supabase SQL execution: not run because Docker/Supabase local are unavailable.

## Release claim

The code quality gate passes when the commands recorded in the latest Sprint report
pass. Production readiness is conditional on staging SQL verification, Production
backup/migration verification, GitHub review, Coolify deployment, and role-based
smoke tests. The project must not be described as fully launched before those
external steps succeed.
