# Souqly 2.0 RC3 — final visual release report

Date: 2026-08-09  
Branch: `souqly-v2-rebuild`  
Build: `souqly-2-reconstruction-rc3-20260809`

## Release scope

This release candidate finalizes the shared visual identity and presentation layer without changing the database structure, migrations, authentication contracts, storage, production data or existing features.

## Design system

| Token      | Value     |
| ---------- | --------- |
| Primary    | `#0F172A` |
| Secondary  | `#1E293B` |
| Accent     | `#F97316` |
| Success    | `#10B981` |
| Warning    | `#F59E0B` |
| Danger     | `#EF4444` |
| Background | `#F8FAFC` |
| Surface    | `#FFFFFF` |
| Border     | `#E2E8F0` |
| Text       | `#0F172A` |
| Muted text | `#64748B` |

The shared radius is `0.75rem`. Card and elevation shadows use restrained navy-tinted values; action emphasis uses a warm-orange shadow. Existing `gold` utility aliases remain available for backward compatibility but now resolve to the approved orange accent.

## Completed refinements

- Header: compact 56px shell, simplified primary destinations, secondary links grouped in “More”, responsive mobile navigation and valid neutral shadow.
- Homepage: compact hero and heading scale, balanced search/actions, real statistics only, trusted-business strip, quieter categories and CTA presentation.
- Marketplace: distinct Products/Services/Assets controls, clearer filters, responsive bottom sheet, polished cards, skeletons and dashed empty state.
- Companies and factories: consistent directory cards, profile panels, verification badges, filter controls and responsive typography.
- RFQ: clearer metadata, quotation cards, selection actions and offer form hierarchy.
- Messaging: mobile-safe list/thread switching, consistent panels, attachments and lazy-decoded images.
- Dashboard: unified stat widgets, accent icon treatment, onboarding panel and responsive spacing.
- RTL/mobile: logical start/end alignment retained, compact gutters, touch-sized controls and layouts that collapse without horizontal overflow.
- Performance: route-level code splitting retained, non-critical homepage sections use content visibility, listing/company/chat images use lazy loading and async decoding.

## Validation evidence

| Gate                        | Result                                                     |
| --------------------------- | ---------------------------------------------------------- |
| TypeScript (`tsc --noEmit`) | Passed                                                     |
| ESLint (`eslint . --quiet`) | Passed                                                     |
| Vitest                      | 53/53 passed across 11 files                               |
| Migration safety audit      | 88 ordered files; passed; no destructive data DDL          |
| Production build            | Passed; 2,472 modules transformed                          |
| Cloudflare/Nitro artifact   | Passed; Wrangler configuration and `_headers` generated    |
| Node production build       | Passed                                                     |
| Route crawl                 | 102/102 passed: 97 HTTP 200, 5 expected HTTP 307 redirects |
| Diff safety                 | No files under `supabase/`; no schema or migration changes |

## Release decision

RC3 is ready for review and publication from the existing connected Lovable workspace after the branch build completes. Deployment and merge remain manual and were not performed by this change.
