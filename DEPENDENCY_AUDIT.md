# Dependency Audit

## Baseline

- Lockfile installation: PASS (`npm ci`).
- React 19, Vite 7, TanStack Start/Router/Query, Supabase JS, Tailwind 4, Radix/Shadcn primitives, Zod and Vitest.
- All installed versions come from the committed lockfile.

## Findings

| Finding | Impact | Plan |
|---|---|---|
| 34 server modules use deprecated `.inputValidator()` | Future TanStack incompatibility/build noise | Migrate mechanically to `.validator()` with typecheck/tests |
| `@supabase/supabase-js` is declared with a caret | Lockfile currently pins resolution, but manifest permits drift on reinstall | Pin exact version in a dedicated dependency update PR |
| React Query is configured globally | Good basis for unified caching; many routes still fetch manually | Migrate module-by-module to query keys/repositories |
| Leaflet and image compression are large | Route splitting exists but must be measured | Keep lazy-loaded and record bundle budgets |
| 326 lint warnings | Maintenance and runtime-risk signal | Zero-error gate retained; warning budget reduced incrementally |
| `js-yaml` advisory GHSA-5p4m-2wfm-xmqj | High-severity transitive dependency advisory | Apply and verify the lockfile-only compatible update before release |
| `nanoid` advisory GHSA-2v37-7h3g-55p8 | High-severity transitive dependency advisory | Apply and verify the lockfile-only compatible update before release |

`npm audit --omit=dev --audit-level=high` currently reports two high-severity transitive findings. No dependency was upgraded during this audit because dependency updates require their own tested phase.
