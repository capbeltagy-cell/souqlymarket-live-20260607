# Souqly production store and payments release

## Scope

This release starts from `main` at `b67d92971aac4b5a4c67001ea4baafc3d7c6cf32`.
It selectively ports production-ready store, tenant, search, checkout, and resilient
UI changes from PRs 8 and 9. It deliberately excludes the duplicated ERP workspace,
old payment/header snapshots, lockfile/tooling changes, and obsolete release notes.

## Implemented

- Store creation and editing with Arabic-name slug generation, logo and cover upload.
- Approval-gated merchant dashboard.
- Store category create, edit, delete, and product assignment.
- Store product creation, inventory fields, publication state, and owner validation.
- Store orders, operations, settings, analytics, and notifications remain connected
  to the existing Supabase-backed dashboard.
- Atomic server-authoritative checkout migration and direct order mutation blocks.
- Existing provider-agnostic Paymob/manual payment layer retained.
- Order proof uploads moved from public listing media to private financial storage.
- Payment proof amount/currency/owner validation, one-pending-proof idempotency, and
  atomic order `pending_review` transition enforced in the database.
- Tenant identity, route guards, storage ownership, and public search visibility
  hardened.
- Primary navigation reduced to Home, Marketplace, Stores, Companies, RFQs, and
  Open Store; account and dashboard links remain in the authenticated menu.

## Database deployment

`supabase/launch_bundle.sql` is generated from the reviewed additive migrations by
`node scripts/build-launch-bundle.mjs`. Apply it only after a database backup in a
staging/test project, then run `supabase/verify_launch.sql`. The verification checks
critical tables, functions, indexes, triggers, RLS, and the private payment bucket.
No production migration was applied by this development task.

## Release gates

- TypeScript, unit/security tests, lint, migration audit, node production build,
  production server smoke test, and route crawl must pass in CI.
- Lint warnings are legacy type/refresh/hook warnings; lint errors are prohibited.
- Live Paymob checkout still requires valid provider secrets and sandbox webhook
  verification before provider payments may be enabled.
- Database migrations and RLS must be exercised against a clean staging database
  before production deployment.
