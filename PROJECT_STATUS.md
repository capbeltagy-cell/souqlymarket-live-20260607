# Souqly project status — final release candidate

Updated: 2026-07-29

## Release state

- Release branch: `release/production-store-payments-20260729`
- Pull request: #12
- Production was not changed by this release pass.
- The configured application Supabase ref is `nszbhxekvzqkhbnpyebr`.
- The Supabase connector exposes a different ref, `qujssmtdzmzsfrgtaitj`, with no
  application migrations or critical Souqly tables. No SQL was applied to it.

## Completed

- Store lifecycle, protected owner dashboard, product CRUD, cart and atomic checkout.
- Server-derived price, ownership and inventory boundaries.
- Manual order payment evidence in a private bucket with signed access.
- Provider-neutral payment records and disabled external adapters when credentials
  are absent.
- Company workspace membership, invitations, CRM and inventory compatibility.
- Signup-role, tenant, listing-owner, storage-update and notification-write hardening.
- Transaction-wrapped launch bundle, dependency guards and read-only verification.

## Verified locally

- Clean install: PASS
- TypeScript: PASS
- ESLint: 0 errors; 326 documented warnings
- Unit/security tests: 49/49 PASS
- Node production build: PASS
- Production server `/health`: HTTP 200
- Static route crawl: 101/101 routes PASS
- Migration safety audit: 86 ordered migrations, no destructive data DDL

## Remaining release gate

Apply `supabase/launch_bundle.sql` once to a backup-protected instance of the
actual project `nszbhxekvzqkhbnpyebr`, then run `supabase/verify_launch.sql`.
Do not run individual release migrations after the bundle on the same environment.
