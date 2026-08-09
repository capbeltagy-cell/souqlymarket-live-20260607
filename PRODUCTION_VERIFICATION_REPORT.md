# Production Verification Report

Date: 2026-08-09  
Branch: `souqly-v2-rebuild`  
Supabase project: `qujssmtdzmzsfrgtaitj`

## Outcome

The approved additive security reconciliation was applied and verified. Production data, users, storage buckets and policies were preserved. Application deployment and branch merge were not performed.

## Preservation artifacts

- `artifacts/production-snapshot-2026-08-09/schema.json`
- `artifacts/production-snapshot-2026-08-09/policies.json`
- `artifacts/production-snapshot-2026-08-09/functions.json`
- `artifacts/production-snapshot-2026-08-09/manifest.json`
- `artifacts/production-snapshot-2026-08-09/rollback.sql`

## Database verification

| Item | Verified state |
|---|---|
| Applied migration | `20260809024013_live_security_reconciliation_v2` |
| `marketplace_stats` | `security_invoker=true` |
| Legacy four-argument referral RPC | `anon=false`, `authenticated=false`, `service_role=true` |
| `has_role` | `anon=false`, `authenticated=true`, `service_role=true` |
| `enforce_listing_owner` | `anon=false`, `authenticated=false` |
| RLS | Enabled on all 43 inspected public/storage tables |
| Policies | 163 retained |

## Build and test verification

- TypeScript: PASS.
- ESLint: PASS with zero errors; 322 warnings remain.
- Tests: PASS, 53/53.
- Cloudflare build: PASS; deploy-ready Nitro/Wrangler artifacts generated.
- Node build: PASS.
- Route crawl: PASS, 102/102.
- Migration safety audit: PASS, 88 files with no destructive data DDL.

## Deployment status

Prepared for pull-request review. No production application deployment, main-branch merge or automatic Cloudflare deployment was performed.
