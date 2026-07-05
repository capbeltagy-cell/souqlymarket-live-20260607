# Souqly Premium Mobile-First Sprint

This is a very large scope. To ship it at real quality (not a superficial pass) I'll deliver it in **4 sequential waves in one sprint**, each verified before moving on. No touching marketer wallet, admin, payments, referrals, or DB schema.

---

## Wave 1 — Mobile-First Foundation (site-wide)

Goal: every page feels premium on phone before desktop, RTL-perfect.

- **SiteHeader**: redesigned mobile nav (bottom-sheet drawer, sticky compact header, large touch targets ≥44px, search chip that expands, role-aware menus preserved).
- **Mobile Bottom Tab Bar** (new component, mobile-only): Home · Search · Post/Companies · Messages · Me. Native-app feel.
- **SiteFooter**: collapsible sections on mobile.
- **Global tokens** (`src/styles.css`): add spacing/typography scale for mobile, safe-area insets (`env(safe-area-inset-*)`), tap-highlight reset, momentum scroll, RTL logical properties audit.
- **Cards/grids**: unify ListingCard, CompanyCard, AgentCard — consistent radius, image ratio, min-height, skeletons, `content-visibility: auto` for long lists.
- **Remove duplicated filter blocks** on marketplace/search/companies/factories pages (single `<FiltersSheet>` on mobile, sidebar on desktop).

## Wave 2 — Visitor Experience (Home + Discovery + Search)

- **Homepage** (`routes/index.tsx`): rebuilt sections in order — Hero + value prop, Category tiles, Featured Companies, Verified Factories, Latest Products, Investment Opportunities, Wholesale Offers, Top Marketers, Success Stories, How It Works, Stats, Partners. All lazy-loaded below the fold.
- **Companies index** (`routes/companies.index.tsx`): tabs — Popular · Verified · Newest · Nearby · Recommended · Trending · Featured Suppliers. Uses existing tables (`companies`, `company_followers`, `is_verified`, `is_premium`, `created_at`, `governorate`). No schema changes.
- **Global Search** (`routes/search-all.tsx` + `GlobalSearch`): Google-style single input, unified filters sheet (Governorate, City, Category, Subcategory, Business type, Verified only, entity tabs: Products/Factories/Companies/Wholesale/Real Estate/Investment), sort (Newest/Popular/Rating).

## Wave 3 — Company Experience

- **Company Dashboard** (`routes/_authenticated/dashboard.tsx` — company branch only, marketer branch untouched): sidebar/tab index of all listed sections. Wires to existing routes (products→listings, services, factories, real-estate, wholesale, campaigns, rfq.mine, quotations, messages, orders, followers, statistics/analytics, wallet, subscription, notifications, settings/profile). No new tables.
- **Company public profile** (`routes/companies.$id.tsx`): LinkedIn/Alibaba-style — cover, logo, verified badges, About, Certificates/licenses/CR/Tax card (uses existing verification docs), gallery, social/website/WhatsApp/phone/email, working hours, Google Map (already have Google Maps connector), stats (followers, products, services, years in business, response rate, avg reply time — computed from existing tables; graceful "—" when absent).
- **Product page** (`routes/listings.$id.tsx`): image gallery + video, price, wholesale price, MOQ, shipping, stock, category/subcategory, specs, downloads, Inquiry / Share / Save, Related products. Uses existing listing fields only; sections hide when data absent.

## Wave 4 — Performance & Polish

- Route-level lazy imports for heavy sections.
- `<img loading="lazy" decoding="async">` + explicit width/height everywhere; AVIF/WebP via `vite-imagetools` for bundled hero images.
- Skeletons on every list/detail.
- React Query: sensible `staleTime`/`gcTime` on discovery queries; prefetch on `Link` intent.
- Preload LCP image on `/`.
- Reduce re-renders (memoize card lists, stable keys, split heavy providers).
- Lighthouse mobile pass; fix CLS on hero and card grids.

---

## Verification per wave

- `tsgo --noEmit` and build after each wave.
- Playwright (mobile viewport 390×844) screenshots of: `/`, `/companies`, `/companies/$id`, `/listings/$id`, `/search-all`, `/dashboard` (company), header drawer, filters sheet.
- Verify RTL by toggling locale to `ar`.

## Explicit non-goals (per your DO NOT list)

- No changes to marketer dashboard, wallet logic, admin, payment system, referral logic.
- No DB schema changes. If a stat truly requires a column that doesn't exist, it's hidden — not faked, not added.

## Delivery

Given the size (~30+ files touched, 4 waves), I'll implement wave-by-wave in this single sprint, posting a brief checkpoint between waves so you can catch drift early. Approving this plan starts Wave 1 immediately.
