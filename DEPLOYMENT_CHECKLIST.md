# Souqly deployment checklist — Cloudflare

## Source of truth

- Repository: `capbeltagy-cell/souqlymarket-live-20260607`.
- Review branch: `souqly-v2-rebuild`.
- Do not publish from `main` until PR #18 is reviewed and merged deliberately.
- Existing Lovable project: `690a1256-6676-460f-acc1-0cfe17aec9a4`; do not create or remix another project.
- Production Supabase ref: `qujssmtdzmzsfrgtaitj`.

## Required environment variables

Configure these in the existing Lovable/Cloudflare environment. Never commit real values.

| Variable | Scope | Required |
|---|---|---|
| `VITE_SUPABASE_URL` | Build | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Build | Yes; publishable key only |
| `SUPABASE_URL` | Runtime | Yes |
| `SUPABASE_PUBLISHABLE_KEY` | Runtime | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Runtime secret | Only for server-only privileged operations |
| `SUPER_ADMIN_EMAILS` | Runtime secret | If email allowlisting is used |

All Supabase URL variables must target `https://qujssmtdzmzsfrgtaitj.supabase.co`. A service-role key must never be stored in a `VITE_` variable.

## Cloudflare build

- Build command: `npm ci && npm run build`.
- The default Nitro preset is `cloudflare-module`.
- Generated artifacts: `.output/server/wrangler.json`, `.wrangler/deploy/config.json`, `.output/public/_headers`, and `.output/nitro.json`.
- Optional prebuilt deployment command after review: `npx nitro deploy --prebuilt`.
- Do not run the deployment command as part of validation.

## Pre-publish gate

- `npm run typecheck`
- `npm run lint` with zero errors
- `npm test -- --run`
- `npm run test:migrations`
- `npm run build`
- Node preview route crawl: 102/102 routes
- Verify Supabase RLS, policy count and security advisors
- Confirm Lovable's environment variable names and project ref in its publish settings

## Supabase and authentication

- Production database migrations are tracked and reconciled separately from application publish.
- Do not replay the repository migration history blindly.
- Site URL: `https://souqlymarket.com`.
- Redirect URL: `https://souqlymarket.com/auth/callback` plus the canonical `www` variant only if used.
- Enable leaked-password protection in Supabase Auth before public launch.

## Rollback

1. Roll Cloudflare back to the prior healthy Worker deployment.
2. If the approved security reconciliation must be reversed, use `artifacts/production-snapshot-2026-08-09/rollback.sql` after incident review.
3. Never reset the database or remove users, buckets, policies or production records.
