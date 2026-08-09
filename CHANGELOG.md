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
