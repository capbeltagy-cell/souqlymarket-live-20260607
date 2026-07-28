# Souqly Release Checklist

| Gate | Status |
|---|---|
| Clean install | PASS |
| Typecheck | PASS |
| Lint errors | PASS — 0 errors |
| Lint warnings | 343 remaining |
| Unit tests | PASS — 22/22 |
| Production build | PASS |
| Node production start | PASS |
| Static route runtime crawl | PASS — 95 tested, 0 failures |
| Production dependency audit | PASS — 0 vulnerabilities |
| Browser visual matrix | BLOCKED |
| Auth journey | BLOCKED — no test environment/accounts |
| Company journey | BLOCKED — no test environment/accounts |
| Marketer journey | BLOCKED — no test environment/accounts |
| Admin mutation journey | BLOCKED — no test environment/accounts |
| RLS matrix | BLOCKED — no disposable Supabase |
| Paymob Sandbox | NOT READY |
| GitHub Actions final run | PENDING PUSH |
| Supabase Production migrations | NOT APPLIED |
| Production deployment | NOT PERFORMED |

Release decision: **NO GO** until authenticated/RLS/browser/Paymob gates pass.
