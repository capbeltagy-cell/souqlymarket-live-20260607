# Test Report

Baseline and reconstruction verification date: 2026-08-09.

| Check | Result | Evidence |
|---|---|---|
| Lockfile install | PASS | 482 packages installed with `npm ci` |
| TypeScript | PASS | `tsc --noEmit` |
| Unit/security tests | PASS | 11 files, 53 tests |
| Lint errors | PASS | `eslint . --quiet`, zero errors |
| Production build | PASS | Vite/Nitro Cloudflare build completed |
| Node preview build | PASS | `NITRO_PRESET=node-server vite build` |
| Route crawl | PASS | 102 static routes: 97 HTTP 200, 5 expected HTTP 307, 0 failures |
| Migration audit | PASS | 88 ordered migrations, no destructive data DDL |
| Feature-flag tests | PASS | Existing modules enabled; beta/disabled modules gated |
| Live schema/advisor inspection | PASS (read-only) | Active project, tables, buckets and advisor findings inspected |
| Live checkout/payment tests | BLOCKED | Production writes were not used as tests |

## Billing hardening verification

- TypeScript: PASS.
- Lint: PASS with zero errors; 324 pre-existing warnings remain.
- Production build: PASS.
- Manual-payment boundary suite: 8/8 PASS.
- Full tests: 53/53 PASS.
- Migration audit: 88 ordered files, no destructive data DDL.

## Reconstruction verification update

- Dependency audit: 0 vulnerabilities after lockfile remediation.
- Route crawl with a running Node preview: 102/102 passed.
- GitHub `production-check` run 86: success.
- Both Vercel preview checks for PR #18: success.

## Existing regression suites retained

Admin permissions, moderation permissions, payment boundaries, Paymob security, order state machine, notification targeting, company-workspace migration, manual-payment boundaries, release readiness and security boundaries.
