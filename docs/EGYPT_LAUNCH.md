# Souqly — Egypt Launch Checklist

## Market positioning
- Primary cities: Cairo, Alexandria, Giza, New Capital, North Coast.
- Primary verticals on day 1: Real Estate, Land, Services. Products as long-tail.
- Primary language: Arabic (default); English as secondary toggle.

## Content readiness
- [x] Demo seed: 3 companies, 3 agents, 6 listings (via `/seed` admin route).
- [ ] Replace demo content with 10–15 real partner companies before public link.
- [ ] At least 30 real listings spread across the 4 categories.
- [ ] Each listing must have ≥ 3 images and an Arabic title + description.

## Local UX
- [x] WhatsApp contact button on every listing (uses `companies.phone`).
- [x] RTL layout when locale = `ar`.
- [ ] Phone validation accepts `+20` and `01XXXXXXXXX` formats. **Add before launch.**
- [ ] Cairo/EET timezone displayed on dashboards. **Currently uses browser locale — acceptable.**

## Payments (Egypt-specific)
- Stripe accepts EG card payments but **automatic EGP payouts are limited**.
- Commission settlement = **manual bank transfer / Instapay**, tracked via the new payout workflow:
  1. Agent clicks "Request payout" on approved commission.
  2. Finance exports CSV from `/commissions`.
  3. Finance pays via bank/Instapay.
  4. Finance marks the row "Paid" — `paid_at` is auto-stamped.

## Support
- WhatsApp Business line for partner companies (recommended).
- Support email on a verified domain (set once email domain is connected).
- Office hours posted on `/support` (TBD).

## Marketing
- [ ] Arabic landing copy reviewed by a native speaker.
- [ ] OG images sized 1200×630 for WhatsApp/Facebook sharing.
- [ ] Referral link program announced to first 50 agents.

## Go/No-Go gates
1. ≥ 10 verified partner companies live.
2. ≥ 30 approved listings.
3. Payment flow tested end-to-end in Stripe test mode.
4. Backup/restore drill completed successfully (see `BACKUP_RECOVERY.md`).
5. Privacy + Terms pages live in EN + AR.
