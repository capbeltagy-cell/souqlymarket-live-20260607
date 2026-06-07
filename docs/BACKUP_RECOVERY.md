# Souqly — Backup & Recovery Plan

## What is automatically backed up
- **Database**: Supabase (Lovable Cloud) takes automatic daily backups and provides Point-In-Time Recovery (PITR) within the retention window of the project's plan.
- **Storage**: `listing-media`, `company-assets`, `avatars` buckets are replicated by Supabase.
- **Auth users**: stored in the same Postgres cluster, covered by the same backups.

## Recovery Time Objective (RTO) / Recovery Point Objective (RPO)
| Scenario | RTO target | RPO target |
|---|---|---|
| Accidental row delete | < 30 min | < 1 hour (PITR) |
| Table dropped | < 1 hour | < 1 hour |
| Full database loss | < 4 hours | < 24 hours |
| Single bucket file loss | < 30 min | last successful sync |

## Manual safeguards
1. **Weekly logical export** (recommended):
   - Run from Cloud → Database → Backups → "Download backup".
   - Store in encrypted off-platform location (e.g. Google Workspace shared drive).
2. **Pre-migration snapshot**: before any destructive schema migration, take a manual backup from the dashboard.
3. **Storage bucket export**: monthly, use `supabase-cli storage cp` or the dashboard to export `listing-media` to cold storage.

## Restore drill (run quarterly)
1. Create a **staging Supabase project**.
2. Restore the latest weekly logical export.
3. Verify row counts on `listings`, `companies`, `agents`, `commissions`, `subscriptions`.
4. Boot Lovable preview against the staging project; verify login + a sample listing.
5. Tear down staging.
6. Record date + outcome in `docs/DRILL_LOG.md`.

## Incident playbook
1. **Identify scope** — single row, single table, or system-wide.
2. **Freeze writes** — flip a maintenance banner via env flag.
3. **Restore** — for row/table issues, prefer PITR to a fresh schema; for full loss, restore the latest backup.
4. **Verify** — run `SELECT count(*)` against the affected tables.
5. **Communicate** — notify partner companies via WhatsApp + email.
6. **Post-mortem** — document root cause, action items, and update this file.

## Encryption
- All Supabase data is encrypted at rest.
- All traffic uses TLS 1.2+.
- Storage signed URLs default-expire in 1 hour.
