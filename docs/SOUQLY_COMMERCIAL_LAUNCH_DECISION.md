# Souqly Commercial Launch Decision

Date: 2026-07-28
Starting SHA: `aadbf268307d0590df24676f154ed27e433e5681`
Final SHA: recorded by the final Git commit and GitHub Actions run.

## Decision: NO GO

Production readiness score: **72/100**.

The code has materially stronger payment boundaries, but commercial launch cannot be approved
without live evidence from an isolated Supabase Test database and Paymob Sandbox. Production was not
changed, deployed, or merged.

## Confirmed locally

- Clean install, TypeScript, unit tests, migration audit, client build, and Node build.
- 97 static routes crawled without HTTP failures.
- Invalid webhook signature returns 401; malformed JSON returns 400.
- Direct authenticated subscription mutation was removed.
- Manual monthly renewal and documented manual payouts are represented truthfully.
- Lint decreased from 343 to 325 warnings with zero errors; 34/34 tests passed.

## Blockers

### P0

- Migrations and live RLS were not executed because no isolated Supabase Test project was available.
- No Paymob Sandbox E2E was executed because Sandbox credentials were unavailable.

### P1

- Visual browser matrix/screenshots need an approved browser-accessible Test URL.
- GitHub Actions must pass on the final pushed SHA.

### P2

- Legacy lint warnings remain outside the launch-critical payment surface.
- The unique-open-payout index needs a data preflight before any future Production migration.

## Required evidence for GO

1. Apply migrations to a new empty Supabase Test project.
2. Execute the role-by-table RLS matrix with synthetic identities.
3. Execute Paymob Sandbox success/failure/replay/concurrency scenarios.
4. Run visual QA on a non-Production Test URL and attach screenshots.
5. Re-run CI and record the tested commit SHA.
