# Migration Report

## Reconstruction RC1

- New migration files: **0**.
- Existing migration files modified: **0**.
- Production migrations executed: **0**.
- Production schema/data modified: **No**.
- Migration safety audit: **PASS** — 86 ordered migration files, no destructive data DDL detected by the repository audit.
- Live migration drift check: **BLOCKED** — Supabase connector denied project access.

No database change was necessary for the first reconstruction slice. Future schema work remains prohibited until a verified backup, live schema inventory and restore rehearsal exist.

## Billing hardening migration

- Added `20260809011544_admin_managed_manual_payments.sql`.
- It is additive/convergent and contains no table, bucket, user or data deletion.
- It restricts direct payment-method writes, preserves authenticated reads of active methods, and pins both manual-payment RPCs to an immutable search path.
- Local migration audit: PASS across 87 files.
- Applied to Production: **No**. Apply and validate on a Supabase development branch first.

## Live security reconciliation — 2026-08-09

- Target: Supabase project `qujssmtdzmzsfrgtaitj`.
- Pre-change exports: schema, policies and functions under `artifacts/production-snapshot-2026-08-09/`.
- Rollback: `artifacts/production-snapshot-2026-08-09/rollback.sql` restores the exact prior view option, function configuration and grants.
- First attempt: failed atomically on unsupported `ALTER FUNCTION IF EXISTS` syntax; PostgreSQL applied no statements from that attempt.
- Applied migration record: `20260809024013_live_security_reconciliation_v2`.
- Destructive operations: none. No reset, drop, truncate, policy deletion, bucket mutation, user mutation or data deletion.
- `marketplace_stats`: changed to `security_invoker=true`.
- Legacy `convert_referral(text, uuid, uuid, numeric)`: execution revoked from PUBLIC, `anon` and `authenticated`; retained for `service_role` only.
- `has_role(uuid, app_role)`: anonymous execution revoked; authenticated and service-role execution retained.
- Trigger-only `enforce_listing_owner()`: client-role execution revoked.
- Nine security-sensitive functions received an immutable empty `search_path`.
- Post-change verification: 163 policies retained and all 43 inspected public/storage tables have RLS enabled.
