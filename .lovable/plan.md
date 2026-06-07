# Phase 3 — High Value Features Plan

Scope is large (8 modules + admin/categories). To keep delivery safe and reviewable, I'll ship in **3 approved waves**, all in Arabic RTL, reusing existing auth/roles/companies/leads/subscription/featured systems untouched.

## Wave 1 — Foundations (DB + Categories + Advanced Search + Public Profile upgrade + Referral)

### New tables (migration, with GRANTs + RLS)
- `business_categories` (slug, name_ar, name_en, icon, sort) — seeded with: Factories, Suppliers, Services, Real Estate, Lands, Industrial Equipment, Construction, Agriculture, Logistics, Marketing.
- `company_profiles_extra` (company_id PK FK, cover_url, whatsapp, website, achievements jsonb, catalog_pdfs jsonb, gallery jsonb, downloads_count int).
- `company_referrals` (code unique, owner_user_id, clicks, signups, conversions) — separate from existing agent `referrals` table.
- Add nullable columns to `companies`: `governorate text`, `company_type text` (factory/supplier/service/...), `category_slug text`, `export_available bool`, `production_capacity text`.

### Routes
- `/categories` and `/categories/$slug` — browse companies/listings by category.
- `/search` — advanced filters (city, category, company_type, verified, subscription level).
- `/companies/$id` — upgraded public profile (cover, gallery, catalog downloads, WhatsApp, website, achievements).
- `/_authenticated/referrals` — referral dashboard with code + stats.

## Wave 2 — RFQ + Wholesale + Factories + Tenders

### New tables
- `rfqs` (buyer_id, category_slug, title, description, quantity, budget_min, budget_max, governorate, attachments jsonb, status [open/closed/awarded], winner_offer_id).
- `rfq_offers` (rfq_id, company_id, price, currency, lead_time_days, notes, status).
- `wholesale_listings` (company_id, title, description, category_slug, moq, price_per_unit, currency, governorate, images jsonb, active) — separate from `listings` so we don't touch existing module.
- `wholesale_orders` (buyer_id, listing_id, quantity, notes, status).
- `factories` (company_id PK FK, production_capacity, employees_range, export_available, certifications jsonb, verified). Verification toggle by admin.
- `tenders` (publisher_id, title, description, category_slug, governorate, budget, deadline, status [open/closed/awarded], winner_proposal_id).
- `tender_proposals` (tender_id, company_id, price, timeline_days, notes, status).

### Routes
- `/rfq` list, `/rfq/new`, `/rfq/$id` (compare offers, pick winner), `/_authenticated/rfq/mine`.
- `/wholesale` list + filters, `/wholesale/$id`, `/_authenticated/wholesale/new`.
- `/factories` directory + filters, `/factories/$id`.
- `/tenders`, `/tenders/$id`, `/_authenticated/tenders/new`, `/_authenticated/tenders/mine`.

## Wave 3 — Analytics + Admin upgrade

### Server fns
- Marketplace stats aggregator (company views, product views, lead conversion, RFQ counts, referral stats).
- Admin metrics: total/paid/free companies, total leads, total RFQs, total referrals, revenue (sum of `payments`).

### Routes
- Extend `/_authenticated/analytics` with RFQ + referral panels.
- Extend `/_authenticated/admin-companies` → add `/admin` overview dashboard with KPIs and revenue chart.

## Cross-cutting rules
- All server-side via `createServerFn` (no edge functions).
- All UI Arabic RTL, reusing existing design tokens.
- Mobile-first responsive (Tailwind) — same components will back a future mobile app via the same server fns.
- Existing modules (subscription, leads, verification, featured) **not modified**, only read.

## Side fix
There's a current preview SyntaxError at line 206 of a route file from the last batch — I'll locate and fix it as part of Wave 1.

---

**Please confirm**:
1. OK to proceed wave-by-wave (Wave 1 first, then I check in)?
2. Any module above to drop or reprioritize?
3. RFQ attachments + catalog PDFs → use existing `company-assets` bucket, or new `rfq-attachments` + `company-catalogs` buckets? (Recommended: new private buckets.)
