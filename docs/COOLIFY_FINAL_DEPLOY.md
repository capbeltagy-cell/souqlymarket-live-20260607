# Coolify final deploy

- Branch: `main` after PR #12 is merged.
- Commit: use the squash commit produced by merging PR #12.
- Build pack: repository `Dockerfile`.
- Build command: Dockerfile handles `npm ci`, typecheck and the Node build.
- Start command: `node .output/server/index.mjs`.
- Port: `3000`.
- Health check: `/health`.
- Required variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `APP_BASE_URL`, `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT=3000`.
- Optional variables: `SUPER_ADMIN_EMAILS`, Paymob variables from `.env.example`;
  keep `ENABLE_ONLINE_PAYMENTS=false` until real provider credentials are verified.
- Redeploy: open the Souqly application, select `main`, then press **Redeploy**.
- Rollback: select the previous healthy image and follow
  `supabase/rollback_notes.md` if database behavior is involved.
- Verification: open `https://souqlymarket.com/health`, require HTTP 200, then
  confirm the deployed commit in the server build log.
