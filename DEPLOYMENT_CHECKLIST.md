# Souqly deployment checklist — Coolify

## 1. Required environment variables

Set these in Coolify. Never commit real values.

| Variable                        | Scope          | Required                  |
| ------------------------------- | -------------- | ------------------------- |
| `VITE_SUPABASE_URL`             | Build          | Yes                       |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Build          | Yes; publishable key only |
| `SUPABASE_URL`                  | Runtime        | Yes                       |
| `SUPABASE_PUBLISHABLE_KEY`      | Runtime        | Yes                       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Runtime secret | Yes; server only          |
| `SUPER_ADMIN_EMAILS`            | Runtime secret | Yes                       |
| `NODE_ENV=production`           | Runtime        | Yes                       |
| `HOST=0.0.0.0`                  | Runtime        | Yes                       |
| `PORT=3000`                     | Runtime        | Yes                       |
| `NITRO_PRESET=node-server`      | Build          | Recommended               |

## 2. Supabase setup

- Site URL: `https://souqlymarket.com`
- Redirect URLs: `https://souqlymarket.com/auth/callback` and the exact `www` variant if used.
- Add the Coolify preview domain only while testing, then remove it.
- Apply `supabase/launch_bundle.sql` in the SQL editor.
- Run `supabase/verify_launch.sql` and require the final `verification = PASS` row.
- Confirm Storage buckets and policies for `listing-media`, `company-assets`, `avatars`, `company-catalogs`, and `rfq-attachments`.

## 3. Coolify application settings

- Deployment type: Dockerfile.
- Dockerfile: `Dockerfile` at repository root.
- Build command when using Nixpacks instead: `npm ci && NITRO_PRESET=node-server npm run build`.
- Start command when using Nixpacks instead: `npm run start`.
- Container port: `3000`.
- Health path: `/health`.
- Health expected status: `200` for GET or `204` for HEAD.
- Persist no application directory; the app is stateless.
- Keep one previous successful image available for rollback.

## 4. Domain, proxy, and HTTPS

- Point the domain to the Coolify server before issuing the certificate.
- Attach `souqlymarket.com`; choose one canonical host and redirect the other.
- Enable automatic HTTPS and HTTP-to-HTTPS redirect.
- Reverse proxy target must be container port `3000`, not a public host port.
- Preserve `Host`, `X-Forwarded-Proto`, and `X-Forwarded-For` headers (Coolify defaults do this).

## 5. Pre-deployment gate

- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `NITRO_PRESET=node-server npm run build`
- Build the Dockerfile and confirm `/health` from inside the deployment network.
- Confirm `.env` is ignored and no service-role key appears in Git history.
- On a workstation with Docker available: `supabase start`, `supabase db reset`,
  `supabase migration list --local`, then `supabase db push --local --dry-run`.

## 6. Post-deployment tests

- Open home, marketplace, companies, stores, and a public store page.
- Sign in and verify `/auth/callback` returns to the intended page.
- Test profile save, saved address, cart, checkout preview, and order history.
- Test company, marketer, store, and admin guards with separate accounts.
- Upload one permitted image and reject an invalid type/oversized image.
- Verify store approval publishes it publicly.
- Check `/health`, browser console, server logs, and Supabase logs.
- Run `supabase/verify_launch.sql` once more after smoke testing.

## 7. Rollback

1. Roll back Coolify to the previous healthy image.
2. If database behavior is involved, enable maintenance mode and follow `supabase/rollback_notes.md`.
3. Restore the pre-launch Supabase backup when partial manual changes or data integrity are uncertain.
