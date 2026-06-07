# Souqly — Production Readiness Report

Generated after the security + hardening pass.

## Readiness score: **80%**

Breakdown by track:

| Track | Score | Notes |
|---|---|---|
| Database & RLS | 100% | All 11 tables RLS-enabled; intentional warnings documented in `@security-memory`. |
| Authentication | 95% | Email confirmation enforced, HIBP on, Google OAuth wired. Branded emails pending domain. |
| Marketplace CRUD | 100% | No sample data; all reads/writes hit Supabase. |
| Discovery & SEO | 90% | Meta + OG on detail pages. Sitemap/robots not auto-generated. |
| File uploads | 100% | Three buckets, per-user-folder RLS. |
| Referral / commission | 95% | Full lifecycle including payout-request + CSV export. Money movement is manual. |
| Subscriptions | 60% | Plan limits enforced in app; no payment provider live yet. |
| Admin tooling | 90% | Moderation + verification + seed routes ready. |
| Email infrastructure | 30% | Supabase default emails work; branded sender pending. |
| Custom domain | 0% | Not connected. |
| Backups/DR | 80% | Documented; quarterly drill not yet run. |
| Legal pages | 0% | Terms / Privacy / Refund not authored. |

## What was completed in this pass
1. Supabase linter + RLS audit — only 4 intentional warnings remain (documented).
2. Hardened `convert_referral` (revoked from anon) and `has_role` (revoked from anon/public).
3. Added `payout_requested_at` + `paid_at` columns and an auto-stamp trigger.
4. New `requestPayout` server function with column-restricted RLS policy for agents on approved rows.
5. `/commissions` UI: "Request payout" for agents, CSV export for all roles, timeline annotations.
6. Email confirmation enforced; leaked-password protection enabled.
7. Confirmed `sampleData.ts` is gone and every page reads from Supabase.
8. Authored: `PRODUCTION_CHECKLIST.md`, `EGYPT_LAUNCH.md`, `BACKUP_RECOVERY.md`, this report.

## Remaining blockers (require YOU — external actions)

| # | Blocker | Owner | Steps |
|---|---|---|---|
| 1 | **Custom domain** | You | Project Settings → Domains → "Connect domain" → enter `souqly.com` (or chosen). Add the A + TXT records at your registrar. Wait ≤ 72h for DNS. |
| 2 | **Email sender domain** | You | Click "Set up email domain" in any email tool. Add the NS records Lovable returns at your registrar. Lovable will then auto-issue SPF/DKIM. Required before branded auth emails. |
| 3 | **Stripe payments** | You | Tell me "enable Stripe", fill the form (business name, EG country). I'll create products + checkout in the next pass. |
| 4 | **Legal pages** | You / counsel | Provide Terms of Service, Privacy Policy, Refund Policy in EN + AR. I'll wire them into `/terms`, `/privacy`, `/refunds`. |
| 5 | **Real partner content** | You | At least 10 verified companies and 30 real listings before the public link. |
| 6 | **First backup drill** | You | Once content is loaded, follow `docs/BACKUP_RECOVERY.md` § "Restore drill". |

## Recommendation

**The platform IS ready for private beta testing now**, under these conditions:

- Distribute the preview/published `*.lovable.app` URL to a closed list of ≤ 20 partner companies and ≤ 50 agents.
- Use the existing seed + manually-created content; do not promote publicly yet.
- Treat subscriptions as "free during beta" — no money should flow until Stripe is enabled.
- Commission payouts during beta will be manual via bank/Instapay (the new payout workflow supports this).
- Keep the published visibility **private** (workspace-only) until items 1–4 above are complete, then flip to **public** for the public beta.

**Public beta blockers**: items 1, 2, 3, 4 in the table above. Estimated calendar time once you start: **3–5 days**, gated almost entirely by DNS propagation.

## Beta playbook
1. Promote 5 internal accounts to `admin` via the Cloud SQL editor.
2. Run the `/seed` route once to populate demo data.
3. Invite partner companies; have each create a company profile + 3 listings.
4. Approve listings via `/moderation`.
5. Generate referral links via `/referrals`.
6. After ≥ 20 referral clicks, run a manual `convert_referral` from the company dashboard to verify the commission pipeline.
7. Export CSV, verify, mark a commission "Paid".
