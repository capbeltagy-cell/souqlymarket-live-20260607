# Souqly — Production Environment Checklist

## 1. Lovable Cloud / Supabase
- [x] RLS enabled on every public table (11/11).
- [x] `has_role` SECURITY DEFINER + separate `user_roles` table.
- [x] `convert_referral` execute revoked from `anon`.
- [x] Storage buckets: `listing-media`, `company-assets`, `avatars` with per-user-folder policies.
- [x] Email confirmation REQUIRED (`auto_confirm_email=false`).
- [x] Leaked-password protection (HIBP) enabled.
- [ ] Daily Point-In-Time-Recovery (PITR) verified in Cloud → Backups. **Manual: confirm in dashboard.**
- [ ] Service-role key rotated within last 90 days. **Manual.**

## 2. Auth
- [x] Email/password sign-up + sign-in.
- [x] Forgot password + `/reset-password` flow.
- [x] Google OAuth via Lovable broker.
- [x] Default role `agent`, upgradeable to `company`/`admin`.
- [ ] Auth email branding (requires email domain setup — see Blockers).

## 3. Frontend
- [x] No `sampleData.ts` references anywhere in `src/`.
- [x] All discovery pages (`/`, `/marketplace`, `/companies`, `/agents`) query Supabase.
- [x] SEO metadata on listing/company/agent detail routes.
- [x] Arabic RTL + English language toggle.
- [x] Mobile-responsive shell.
- [x] Empty-state UI on commissions / referrals / favorites / marketplace.

## 4. Payments & Billing
- [x] Subscription table + plan limits enforced (Free / Premium Company / Premium Agent).
- [x] Commission lifecycle: pending → approved → payout-requested → paid (with `paid_at` auto-stamp).
- [x] CSV export for finance team.
- [ ] Stripe checkout wiring. **Manual: enable Stripe Payments.**
- [ ] EGP currency decision. **Manual.**

## 5. Observability
- [ ] Error reporting reviewed weekly. **Operational.**
- [ ] Supabase linter run before each release. Current state: 4 intentional WARNs (documented in `@security-memory`).

## 6. Legal / Compliance (Egypt)
- [ ] Terms of Service in EN + AR. **Content task.**
- [ ] Privacy Policy in EN + AR. **Content task.**
- [ ] Refund policy for paid subscriptions. **Content task.**
- [ ] Cookie banner if targeting EU traffic. **Defer.**

## 7. Performance
- [x] Images served from Supabase Storage (CDN-backed).
- [x] Route-level code splitting via TanStack file routing.
- [ ] Lighthouse pass ≥ 80 on `/`. **Run before launch.**
