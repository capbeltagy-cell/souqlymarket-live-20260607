# Souqly Simplification & Journey Completion Plan

Scope: improve existing pages in place. No redesign, no duplicate tables, no new pages unless a journey step is entirely missing. Keep current design language and all functionality.

---

## 1. Publish Flow (`src/routes/_authenticated/listings.new.tsx`, `rfq.new.tsx`, `tenders.new.tsx`, `wholesale.new.tsx`)

- Collapse form to **6 required fields only**: Title, Price, Category, Description, City, Images.
- Wrap everything else (governorate detail, coordinates, phone/whatsapp, video, PDF, property specs, commission %, address line, purpose, ownership) in a single `<Collapsible>` "خيارات متقدمة / More Options" — default collapsed.
- Auto-fill governorate from city where possible; default `commission_percentage` server-side.
- Submit button sticky at bottom on mobile; single primary CTA.
- Target: < 60s to publish.

## 2. Image Upload (`src/components/` — new small shared `ImageUploader.tsx` reused across publish forms)

Improve, do not duplicate. One shared component that:
- Drag & drop + click + camera capture (`<input capture="environment">` on mobile).
- Multi-select, instant upload to `listing-media` bucket via signed upload.
- Client-side compression using `browser-image-compression` (max 1600px, ~0.7 quality).
- Per-file progress bars, thumb previews, drag-to-reorder (dnd-kit already available? — otherwise plain HTML5 DnD), delete, primary-image marker.
- Persists URLs to form state as it uploads so navigation doesn't lose them; localStorage draft fallback.
- Returns `{ url, source: 'uploaded' | 'live_capture' }[]`.

Replace ad-hoc uploaders in `listings.new.tsx`, `wholesale.new.tsx`, `rfq.new.tsx` with this component.

## 3. Buyer Journey — keep in-platform

Product → Chat → Quote → Order → Payment → Shipping → Delivery → Review.

Existing surfaces used:
- Product: `listings.$id.tsx` (add "اطلب الآن / Order" button next to existing message CTA).
- Chat: `messages.tsx` (extended, see §4).
- Order: new lightweight surface `_authenticated/orders.tsx` + `orders.$id.tsx` reading existing `wholesale_orders` table repurposed as generic orders (extend, do not duplicate).
- Payment: existing `wallet.tsx` + `payments` table.
- Review: existing `reviews` table via `CompanyReviews` after `status='completed'`.

## 4. Real-time Chat (`src/routes/_authenticated/messages.tsx` + `messages` table)

Extend, don't rebuild:
- Realtime subscription on `messages` and `conversations` (already Supabase realtime capable — enable via migration `ALTER PUBLICATION`).
- Attachment types via new columns on `messages`: `attachment_url text`, `attachment_type text` (image/file/pdf/voice), `duration_ms int`. Migration only if columns missing.
- Typing indicator via Supabase Broadcast channel (no table).
- Read receipts: `read_at timestamptz` column on messages.
- Voice: `MediaRecorder` → upload to `listing-media/voice/`.
- Inline "Send Quotation" button → creates draft order row and posts a system message linking to it.

## 5. Order Workflow

Reuse `wholesale_orders`. Add columns via migration only if missing:
- `status` enum extended: draft, awaiting_seller, accepted, packed, shipped, delivered, completed, cancelled, returned.
- `tracking_number text`, `shipping_address jsonb`, `buyer_id uuid`, `listing_id uuid nullable`.

Add server fns in new `src/lib/orders.functions.ts`: `createOrderFromListing`, `updateOrderStatus`, `listMyOrders` (buyer/seller scoped by RLS).

Add pages `orders.tsx` (list, buyer+seller tabs) and `orders.$id.tsx` (timeline + actions per role).

## 6. Payments

No new provider now. Ensure existing `wallets`, `payments`, `invoices`, `payout_requests` plumbing is exposed:
- Order payment: debit buyer wallet → credit escrow (platform wallet, reason 'escrow_hold') → on delivered+completed release to seller. Add SQL fn `release_order_escrow(order_id)`.
- Admin approval fallback: if no gateway configured, order stays `awaiting_payment_approval` and admin marks paid in `admin-revenue.tsx`.

## 7. Company Dashboard (`_authenticated/dashboard.tsx`, `company.tsx`)

Consolidate existing widgets into a single tabbed view: Orders · Customers · Messages · Products · Analytics · Wallet · Invoices · Notifications. Do not create new pages — link/embed existing routes as tabs where practical.

## 8. Customer Dashboard (`_authenticated/profile.tsx` extension or `dashboard.tsx` role-branch)

Tabs: Orders · Saved · Messages · Invoices · Wishlist · Addresses · Tracking. Wishlist = existing `favorites`. Addresses = new small `user_addresses` table (only if genuinely missing).

## 9. Search (`src/components/GlobalSearch.tsx`, `src/lib/global-search.functions.ts`)

- Normalize Arabic (strip tashkeel, alef variants) both query + stored strings via SQL immutable fn.
- Trigram indexes (`pg_trgm`) on titles for typo tolerance.
- Add voice input (Web Speech API) and image search (Lovable AI vision → keyword extraction → existing search).
- Barcode/QR via `@zxing/browser` on mobile.

## 10. Notifications (`NotificationBell.tsx`, `notifications` table)

Enable realtime on `notifications`. Toast on new arrival. Existing table covers messages/orders/payments/shipping/approvals — just wire triggers for order status changes.

## 11. Simplification Sweep

- Move rare admin/config toggles behind "Advanced" collapsibles.
- Reduce nav items in `SiteHeader.tsx` to: Home · Marketplace · Companies · Messages · Sell · Menu (rest under dropdown).
- Merge `referrals.tsx` + `campaigns.tsx` links under Marketing Center menu (already exists).

## 12. Cleanup (no deletions of features, just relocation)

- Consolidate duplicate "post" entry points into single `/sell` chooser.
- Remove dead imports flagged by `bunx tsgo --noEmit`.

---

## Technical execution order

1. Migration: add missing columns (messages attachments/read, orders status/tracking/buyer, notifications realtime publication, pg_trgm + indexes).
2. Shared `ImageUploader` component + `browser-image-compression` dep.
3. Refactor 4 publish pages to use uploader + collapsible advanced.
4. Extend messages page with realtime + attachments + quote button.
5. Orders pages + server fns + escrow SQL fn.
6. Dashboard tab consolidation (company + customer).
7. Search enhancements.
8. Notification realtime + toast.
9. Nav simplification.
10. Typecheck + smoke test key flows.

## Non-goals

- No new payment provider integration.
- No new database tables where an existing one fits (extend instead).
- No visual redesign — same tokens, same shadcn components.
- No changes to auth, RLS model, or admin/security policies from the previous turn.

## Risks

- Large surface — will land as a series of focused edits in one turn per subsystem; if a subsystem takes too long, ship it standalone and continue next turn rather than leave half-broken code.
- Realtime cost — filter subscriptions by conversation_id / user_id only.
