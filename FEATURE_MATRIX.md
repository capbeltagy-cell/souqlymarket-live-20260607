# Souqly 2.0 Feature Preservation Matrix

Baseline: `main@ff10d5ab1e0f516ab52061fa875bc84f62826699`  
Audit date: 2026-08-09  
Rule: preserve every existing capability; refactor only behind compatible routes and database contracts.

| Pillar | Existing capability | Primary routes/data | Reconstruction target | Status |
|---|---|---|---|---|
| Discover | Home, global search, categories, maps | `/`, `/search-all`, `/categories`, `/map`; `listings`, `companies` | Unified public shell and product/service/asset taxonomy | In progress |
| Discover | Companies and factories | `/companies`, `/factories`; `companies`, `factories`, `company_profiles_extra` | Organization-first profiles | Preserved |
| Discover | Stores and wholesale | `/stores`, `/wholesale`; `stores`, `wholesale_listings` | Company → Store hierarchy | Preserved |
| Buy | Cart and checkout | `/cart`, `/checkout`; `wholesale_orders`, atomic order functions | One validated purchase workflow | Preserved |
| Buy | Orders and payment proofs | `/orders/*`; `payments`, `payment_proofs`, `payment_methods` | Auditable order/payment state machine | Preserved |
| Sell | Listings and inventory | `/listings/new`, `/store/*`, `/business-suite`; `listings`, `inventory_*` | Company workspace modules | Preserved |
| Sell | Store staff, categories and coupons | `/store/categories`, `/store/coupons`; `store_staff`, `store_categories`, `store_coupons` | Store operations | Preserved |
| Connect | RFQs and quotations | `/rfq/*`, `/quotations/*`; `rfqs`, `rfq_offers`, `quotations`, `quotation_items` | Complete RFQ comparison lifecycle | Preserved |
| Connect | Tenders | `/tenders/*`; `tenders`, `tender_proposals` | Feature-flagged procurement module | Preserved |
| Connect | Messaging and notifications | `/messages`; `conversations`, `messages`, `notifications` | Searchable linked inbox | Preserved |
| Manage | Company center and business suite | `/company-center`, `/company`, `/business-suite` | `CompanyWorkspaceLayout` | In progress |
| Manage | Admin modules | `/admin-*`, `/control-center-x7`; admin tables/functions | Separate admin information architecture | Preserved |
| Growth | Agents, campaigns, referrals, commissions | `/agent*`, `/campaigns`, `/referrals`, `/commissions` | Feature-flagged affiliate program | Preserved |
| Finance | Wallets, payouts, deposits, invoices | `/wallet`, `/payouts`, `/company-wallet`, `/invoices` | Explicit financial boundaries | Preserved |
| Trust | Verification, reviews, moderation, disputes | `/verification`, `/moderation`; review/moderation/dispute tables | Unified trust center | Preserved |
| Platform | Auth, roles and permissions | `/auth`, `user_roles`, `role_permissions`, `has_role`, `has_permission` | Central guards without metadata authorization | Preserved |
| Platform | PWA, SEO and Cloudflare build | manifest, sitemap, route heads, Nitro output | Performance and accessibility gate | Preserved |

## Code inventory

- 117 route files are currently versioned, spanning public, authenticated, workspace, growth and admin surfaces.
- 82 component files are currently versioned, alongside the shared library, hooks and i18n context.
- No repository layer existed at baseline; server functions and route-level queries currently act as the data layer.
- 477 explicit `any` occurrences remain in TypeScript source and are tracked as a gradual typing backlog.

## Preservation gates

1. Old URLs remain routable until a tested redirect exists.
2. Existing database objects and migrations are append-only.
3. Existing modules may be hidden only by an explicit feature flag, never deleted.
4. Empty production datasets render an honest empty state, never fabricated content.
5. All financial, role and ownership behavior requires regression tests before refactoring.
