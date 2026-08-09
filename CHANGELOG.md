# Changelog

## Souqly 2.0 reconstruction RC1 — 2026-08-09

### Added

- Truth-audit and preservation documents for features, routes, database, storage, permissions, dependencies and security.
- Reusable `PublicLayout`, `AuthLayout`, `AccountLayout`, `CompanyWorkspaceLayout` and workspace sidebar.
- Canonical marketplace taxonomy separating products, services and assets from organizations.
- Typed feature flags supporting `enabled`, `disabled`, `beta` and `admin_only` states.
- Real `/services` route backed by approved service listings with React Query caching and honest collection states.
- Shared marketplace repository and stable query-key factory.
- Homepage sections for live RFQs, real reviews and product-policy FAQ.

### Changed

- Homepage now uses the unified public shell.
- Main navigation now exposes companies, factories, services, RFQs and business solutions directly.
- Homepage counters render only after all count queries succeed and no longer append a misleading `+`.
- Migrated 34 server modules from deprecated TanStack `.inputValidator()` to `.validator()`.
- Build identifier updated to `souqly-2-reconstruction-rc1-20260809`.

### Preserved

- Authentication, role logic, storage, existing routes, features, migrations and database contracts.
- No production SQL, deployment, merge, destructive DDL or mock production data.

## Souqly 2.0 billing hardening — 2026-08-09

### Added

- Admin-managed InstaPay and Vodafone Cash destination numbers, instructions, activation state and display order.
- Database migration hardening manual-payment RPC search paths and payment-method grants.
- Regression coverage proving checkout destinations come from admin-managed records rather than source constants.

### Fixed

- Removed the hardcoded payment destination from the checkout backend.
- Replaced legacy `paid` subscription comparisons with the canonical `premium_company` enum value.
- Expired subscriptions no longer retain paid-plan access through the billing helper.
- Manual payment approval remains atomic: payment transaction, subscription renewal, company activation, notification and audit event are committed together.
# 2026-08-09 — Production security reconciliation

- Exported the current production schema, RLS policies and function definitions.
- Added an exact rollback script and verification logs.
- Reconciled `marketplace_stats` to invoker security.
- Restricted the unsafe legacy referral RPC to the service role.
- Hardened authorization/trigger function grants and function search paths.
- Preserved all production data, users, buckets and 163 policies.
- Re-ran TypeScript, lint, 53 tests, migration audit, Cloudflare/Node builds and the 102-route crawl.
