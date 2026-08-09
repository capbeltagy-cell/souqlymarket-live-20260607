# Souqly 2.0 RC4 — final product QA report

Date: 2026-08-09  
Repository: `capbeltagy-cell/souqlymarket-live-20260607`  
Branch: `souqly-v2-rebuild`  
Build: `souqly-2-reconstruction-rc4-20260809`

## Files changed

- Public navigation and metadata: `SiteHeader.tsx`, `__root.tsx`, `manifest.webmanifest`, `icon.svg`.
- Marketplace and organization states: `marketplace.tsx`, `companies.index.tsx`, `factories.tsx`, `index.tsx`.
- Compatibility routes: `login.tsx`, `register.tsx`, `account.tsx`, `workspace.tsx`, `admin.tsx`, `support.tsx` and generated route tree.
- Release metadata: `build-info.ts`, `CHANGELOG.md`, this report.

## Routes fixed

| Route        | Resolution                                                                |
| ------------ | ------------------------------------------------------------------------- |
| `/login`     | Permanent application-level compatibility redirect to `/auth?mode=signin` |
| `/register`  | Compatibility redirect to `/auth?mode=signup`                             |
| `/account`   | Redirect to protected `/profile` flow                                     |
| `/workspace` | Redirect to protected `/company-center` flow                              |
| `/admin`     | Redirect to guarded `/admin-overview` flow                                |
| `/support`   | Redirect to public `/contact` page                                        |

The complete static route crawl passed 108/108 routes: 97 returned HTTP 200 and 11 returned expected HTTP 307 redirects. Primary public routes `/`, `/marketplace`, `/companies`, `/factories`, `/services`, `/rfq` and `/tenders` returned HTTP 200.

## UI defects fixed

- Public header now exposes Marketplace, Companies & Factories, RFQ, Services and Business, with tenders, marketer program and help destinations grouped under secondary menus.
- Marketplace filters expose exactly three business domains: Products, Services and Assets.
- Legacy listing types are normalized into those domains at query/presentation time. Company records are excluded from product results; no records were deleted.
- Homepage, company directory and factory directory no longer display unattractive zero counters when production collections are empty.
- Empty collections retain polished, truthful empty states and never fabricate activity.
- Homepage message now explains the complete Souqly value proposition directly.
- PWA browser theme and icon colors match the approved navy/orange palette.

## Authentication and authorization status

- Guest access to authenticated routes is protected by the shared `_authenticated` guard.
- Login return paths reject protocol-relative/external redirects.
- Admin routes use `requireAdminRoute` or an equivalent explicit admin role check.
- Business and agent guards query server-backed roles before route entry.
- Security regression tests for admin permissions, moderation, payments, notifications and security boundaries all pass.
- Live role mutation journeys were not performed because the release rules prohibit creating or modifying production data. Existing guards and server/RLS boundaries were verified without writes.

## Feature status

| Area              | Status                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Marketplace       | Products / Services / Assets normalized; search, filters, loading and empty states verified                              |
| Company directory | Professional cards/profile flow; no fake or zero statistics                                                              |
| Factory directory | Organization discovery retained outside product categories; filters and empty state verified                             |
| RFQ               | Creation, offers, award controls and status flow retained; permission tests/build pass                                   |
| Messaging         | Inbox, read state, attachments and linked quotation/order rendering retained; RLS enabled on production messaging tables |
| Mobile            | Responsive navigation, filters, message list/thread and touch controls verified through source/build audit               |
| RTL               | Logical start/end utilities and RTL submenu direction retained; Arabic is the document default                           |

## Console, network and production connectivity

- Node production server completed the full crawl without HTTP 500 responses.
- No application error, unhandled exception, hydration error or CORS error appeared in the server crawl log.
- Supabase project `souqlymarket-live-20260607` reports `ACTIVE_HEALTHY`.
- Read-only production metadata confirmed public tables are reachable and RLS is enabled, including profiles, roles, companies, listings, RFQs, offers, notifications and messaging tables.
- No database write, schema change, migration, user change, storage change or production-data mutation was performed.

## Final validation

| Gate                   | Result                                                  |
| ---------------------- | ------------------------------------------------------- |
| TypeScript             | Passed — 0 errors                                       |
| ESLint                 | Passed — 0 errors                                       |
| Vitest                 | Passed — 53/53 tests across 11 files                    |
| Dependency audit       | Passed — 0 vulnerabilities                              |
| Migration audit        | Passed — 88 ordered migrations, no destructive data DDL |
| Production build       | Passed — 2,478 modules transformed                      |
| Cloudflare/Nitro build | Passed — deployment configuration generated             |
| Node production build  | Passed                                                  |
| Route/public crawl     | Passed — 108/108                                        |

## Remaining blockers

No repository, build, route, dependency or production-connectivity blocker remains. End-to-end mutations for each live role require dedicated non-production QA accounts and data; they were intentionally not run against production.

Lovable deployment was requested for the existing project and returned deployment ID `7c4809bf-3f23-4061-91b6-89e5a5f3ebf7`. The deployment completed, but Lovable's project snapshot remained pinned to its old internal commit `8ad77e4d2dc5e35e82c9d4705e1f433f0b5b23d1`. A live response check identified build `souqly-2-reconstruction-rc1-20260809`, not RC4. Two programmatic requests to refresh the project from its connected `souqly-v2-rebuild` branch were rejected by Lovable with `INVALID_ARGUMENT`.

The exact remaining action is to refresh/synchronize the connected branch inside the existing Lovable editor until it recognizes GitHub commit `4b955186c3cd9d0133f36e2a2f1e577cce0a5bac`, then publish again. Do not publish the currently cached Lovable snapshot as the final RC4 release.

## Release decision

RC4 is complete and suitable for publication, but the current Lovable production URL has not consumed the RC4 branch commit. No new project, repository, database environment or migration was created.
