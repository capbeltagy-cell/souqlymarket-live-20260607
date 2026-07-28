# Souqly Runtime and E2E Results

Audit date: 2026-07-28  
Repository: `capbeltagy-cell/souqlymarket-live-20260607`  
Branch: `feat/multi-vendor-stores`  
Starting SHA: `54c23f342b498f0642320b3e1a85bf119bed56f7`

## Executed commands

| Gate | Command | Result |
|---|---|---|
| Clean install | `npm ci --cache /tmp/souqly-npm-cache --prefer-online` | PASS — 517 packages |
| TypeScript | `npm run typecheck` | PASS |
| Lint | `npm run lint` | PASS with 343 warnings, 0 errors after repair |
| Unit tests | `npm test` | PASS — 6 files, 22 tests |
| Lovable build | `npm run build` | PASS |
| Node production build | `npm run build:node` | PASS |
| Production dependencies audit | `npm audit --omit=dev --audit-level=high` | PASS — 0 vulnerabilities |

## Runtime

- Development server started successfully.
- Node production server started successfully after generating the `node-server` Nitro preset.
- Initial production preview returned HTTP 500 because `vite preview` expected `dist/server/server.js` while this project emits Nitro output. The preview scripts were corrected.
- Initial static route crawl logged `window is not defined` on `/map` because Leaflet was imported during SSR. A client-only map boundary fixed the error.
- Final static crawl: 111 generated unique routes, 95 non-parameterized routes tested.
- Results: 91 HTTP 200, 4 intentional HTTP 307 canonical redirects, 0 HTTP failures, 0 server errors.
- Three discovered parameter-like links (`/rfq/new`, `/tenders/new`, `/wholesale/new`) returned HTTP 200.

## Not executed

- Browser DOM, console, accessibility and screenshot validation was blocked because the cloud browser rejected access to the local address.
- Authenticated journeys were not executed because no isolated test Supabase environment and no test accounts were available.
- No write operation was sent to Supabase Production.

## Decision

Runtime smoke tests: **PASS**.  
Full authenticated end-to-end acceptance: **NOT VERIFIED**.
