
# Souqly Enterprise Upgrade — Phased Plan

The brief covers ~6 months of engineering. To deliver it safely **without breaking the live platform**, the work must be split into phases. Each phase is shippable on its own, keeps the site online, and adds real value before the next one starts.

Below is the proposed phasing. After you approve, I'll execute **Phase 1** end-to-end in the next turn, then check in before starting Phase 2.

---

## Guardrails applied to every phase

- No table dropped, no route removed, no auth change.
- All new tables ship with RLS + GRANTs in the same migration.
- New code is additive: new files/routes, existing routes only get extensions.
- Every phase ends with: build green, TypeScript clean, smoke test of key routes, security scan.

---

## Phase 1 — Roles, Permissions & Audit Foundation
Adds the 13-role permission system the rest of the upgrade depends on.

- Extend `app_role` enum with the missing roles (super_admin, moderator, support, factory, service_provider, wholesaler, importer, exporter, distributor — buyer/admin/customer/agent already exist).
- New tables: `role_permissions`, `audit_logs`, `user_activity`.
- `has_permission(uid, key)` SQL helper + React `usePermissions()` hook.
- Wrap sensitive admin routes with permission gates (no behavior change for existing users).
- Audit trigger on critical tables (companies, listings, commissions, wallets).

## Phase 2 — Company Workspace (Dashboard v2)
Turns the existing company page into a full workspace, without removing the current one.

- New `/_authenticated/workspace/*` subtree: overview, branches, employees, documents, catalogs, certificates, gallery, videos.
- New tables: `company_branches`, `company_employees`, `company_documents`, `company_certifications`.
- Document/catalog/certificate uploads use the existing `company-catalogs` bucket with folder-scoped RLS.
- Existing `/company` route stays as a redirect/alias.

## Phase 3 — Factory, Service Provider, Wholesaler verticals
Adds dedicated profile + listing flows per vertical (extends, doesn't replace, current factory/wholesale tables).

- Extend `factories` with MOQ, OEM, ODM, export_countries, production_capacity_detail.
- New `service_packages`, `service_portfolio_items` for service providers.
- Vertical-specific publish wizards reusing the current `listings.new` form.

## Phase 4 — Commission Engine v2
Replaces the flat-percentage model with the rules engine specified.

- New tables: `commission_rules` (type: percent/fixed/tiered/volume/revenue/category/campaign/country/recurring/bonus), `commission_settlements`.
- Pure-function `calculateCommission(order, rules)` server function, fully unit-tested.
- Existing `commissions` table keeps working; new orders go through the engine, old rows untouched.
- Approval workflow UI for finance.

## Phase 5 — CRM, Messaging & Notifications
Brings sales pipeline + realtime chat in line with the brief.

- Extend `leads` with `pipeline_stage`, `opportunity_value`, `next_followup_at`, `notes` (JSONB).
- New tables: `conversations`, `messages`, `message_attachments`, `notifications`.
- Realtime via existing Supabase Realtime channel; typing/read receipts.
- Notification center in the header (replaces the current empty placeholder).

## Phase 6 — Payments Architecture & Wallet v2
Prepares the rails for Stripe/Paymob/Fawry/USDT/Bank without enabling live keys.

- New `payment_methods`, `payouts`, `wallet_holds`, `wallet_splits` tables.
- Provider-agnostic `PaymentProvider` interface; stubs for Paymob/Fawry; existing Stripe BYOK path stays.
- Automatic split: agent / company / platform on settlement.
- Invoice generator already exists — extended with refund + dispute records.

## Phase 7 — AI Assistant Suite
All AI features use Lovable AI Gateway (no extra keys).

- `/api/ai/*` server routes: description, SEO, marketing post, translation, email, WhatsApp message, quotation, tags, image-suggestions.
- "Generate with AI" buttons added to existing forms (listings.new, company profile, RFQ, tender, quotations).
- Streamed responses, per-company rate limits via `audit_logs`.

## Phase 8 — Admin Control Center, Analytics & Polish
Final polish layer.

- Promotes `/control-center-x7` into a full Super Admin shell: users, companies, factories, agents, categories, subscriptions, commission rules, ads, CMS, feature flags, audit logs, security, system settings.
- Executive analytics dashboard: revenue, GMV, conversion, top performers, exports (CSV/PDF).
- Design polish across the app: enterprise sidebar shell for `_authenticated` routes, dark/light toggle, glassmorphism cards, motion-reduced animations, full accessibility pass, Lighthouse target ≥ 90 mobile.

---

## What I will NOT do

- Not deleting any existing route, table, column, or integration.
- Not creating demo/seed data (you cleaned it; it stays clean).
- Not enabling live payment keys — that's an owner action with secrets.
- Not changing the current auth flow (email/password + Google through Lovable broker).

---

## Technical notes (for review)

- All new tables follow the strict template: `CREATE TABLE` → `GRANT` → `ENABLE RLS` → `CREATE POLICY`.
- Permissions use `has_role` + new `has_permission` security-definer functions to avoid RLS recursion.
- Realtime tables added to `supabase_realtime` publication explicitly.
- New server logic uses `createServerFn` with `requireSupabaseAuth`; admin endpoints additionally verify `has_role('super_admin' | 'admin')`.
- File uploads continue using existing storage buckets with folder-scoped RLS — no new public buckets.
- All new UI uses the existing Noir & Gold design tokens; no hardcoded colors.

---

## What I need from you

1. **Approve the phasing** (or tell me to merge/reorder phases).
2. **Confirm priority order** — default is 1 → 8 sequentially. If you want, e.g., Commission Engine before Company Workspace, say so.
3. After approval, I start **Phase 1** immediately and ship it. Each subsequent phase begins only after you confirm the previous one is good in production.
