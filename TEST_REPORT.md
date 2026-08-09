# Test Report

Baseline and reconstruction verification date: 2026-08-09.

| Check | Result | Evidence |
|---|---|---|
| Lockfile install | PASS | 482 packages installed with `npm ci` |
| TypeScript | PASS | `tsc --noEmit` |
| Unit/security tests | PASS | 11 files, 51 tests |
| Lint errors | PASS | `eslint . --quiet`, zero errors |
| Production build | PASS | Vite/Nitro Cloudflare build completed |
| Node preview build | PASS | `NITRO_PRESET=node-server vite build` |
| Route crawl | PASS | 102 static routes: 97 HTTP 200, 5 expected HTTP 307, 0 failures |
| Migration audit | PASS | 86 ordered migrations, no destructive data DDL |
| Feature-flag tests | PASS | Existing modules enabled; beta/disabled modules gated |
| Live RLS tests | BLOCKED | Supabase connector permission denied |
| Live checkout/payment tests | NOT RUN | Production access prohibited and no safe branch database available |

## Existing regression suites retained

Admin permissions, moderation permissions, payment boundaries, Paymob security, order state machine, notification targeting, company-workspace migration, manual-payment boundaries, release readiness and security boundaries.
