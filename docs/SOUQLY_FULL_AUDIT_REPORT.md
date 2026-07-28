# Souqly Real Build, Runtime & E2E Validation

Audit date: 2026-07-28  
Repository: `capbeltagy-cell/souqlymarket-live-20260607`  
Branch: `feat/multi-vendor-stores`  
Starting SHA: `54c23f342b498f0642320b3e1a85bf119bed56f7`  
Requested reference `2c8a3876851b62800227ac434d8d28b353001689` is not present in this public repository history.

## Checkout

Anonymous clean clone:

`git -c credential.helper= clone --branch feat/multi-vendor-stores --single-branch https://github.com/capbeltagy-cell/souqlymarket-live-20260607.git souqly-audit`

- Node: `v24.14.0`
- npm: `11.9.0`
- Lock file: `package-lock.json`
- Initial worktree: clean

## Results

- Clean install: PASS.
- TypeScript: PASS.
- Lint: 0 errors, 343 warnings.
- Tests: 22/22 PASS across 6 files.
- Lovable/edge production build: PASS.
- Node production build/start: PASS.
- Production dependency audit: 0 vulnerabilities after safe lockfile updates.
- Routes: 111 unique generated routes; 95 static routes runtime-tested; 0 HTTP failures; 0 final server errors.
- Browser visual/E2E: blocked by localhost browser isolation.
- Auth/company/marketer/admin mutation E2E: blocked because no isolated Supabase test environment/accounts exist.
- RLS runtime matrix: not executed against Production.
- Paymob Sandbox: not implemented/available for validation.
- Supabase Production: untouched.

## Fixed issues

### P0

1. Public agent page exposed commission-derived earnings and phone/WhatsApp data. Replaced with an explicit server-side public projection.
2. Super-admin authorization automatically granted the admin role. Replaced with a read-only existing-role check.
3. Generic super-admin hard delete accepted a caller-selected entity. Removed.
4. Moderation hard-deleted listings. Replaced with a reversible status update.
5. Production dependencies contained one critical and multiple high vulnerabilities. Safe in-range lockfile updates removed all Production vulnerabilities.

### P1

1. `vite preview` returned HTTP 500 because it expected incompatible TanStack output. Added a Node Nitro build/preview path.
2. `/map` triggered `window is not defined` during SSR through Leaflet. Added a client-only lazy boundary and used it in all map consumers.

## Changed files

- `package.json`
- `package-lock.json`
- `src/components/ClientMapView.tsx`
- `src/lib/public-agent.functions.ts`
- `src/lib/security-boundaries.test.ts`
- `src/lib/moderation.functions.ts`
- `src/lib/super-admin.functions.ts`
- `src/routes/agents.$id.tsx`
- `src/routes/map.tsx`
- `src/routes/listings.$id.tsx`
- `src/routes/_authenticated/listings.new.tsx`
- Audit documents under `docs/`

## Remaining blockers

1. 343 lint warnings.
2. Browser responsive, console, accessibility and screenshot tests.
3. Authenticated role journeys on a disposable test environment.
4. Real RLS matrix validation.
5. Paymob Sandbox integration and callback security tests.
6. GitHub Actions must pass on the final pushed SHA.

## Release decision

**NO GO**

Production readiness score: **6.5/10**. The application now installs, typechecks, tests, builds, starts and serves its static route inventory without server errors. It is not approved for a real-money release until the remaining authenticated, RLS, visual and Paymob gates are proven.
