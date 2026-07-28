# Souqly Release Checklist

Date: 2026-07-28

- [x] Clean install succeeds.
- [x] TypeScript succeeds.
- [x] Unit/static security tests succeed.
- [x] Client and Node production builds succeed locally.
- [x] Static route crawl succeeds.
- [x] Paymob secrets stay outside the client contract.
- [x] Client-side subscription activation removed.
- [x] Webhook verification, idempotency, auditing, and amount/currency guards implemented.
- [x] Manual monthly renewal and manual payout settlement stated truthfully.
- [x] Migration destructive-operation audit succeeds.
- [x] `.env.test.local` exists locally and is ignored.
- [x] `.env.example` contains variable names only.
- [x] Manual subscription payment UI and admin review queue implemented.
- [x] Manual approval is an atomic database RPC with transaction, notification and audit records.
- [x] Manual payment proofs are private and owner/admin scoped.
- [x] Paymob hidden from user-facing screens without deleting its code.
- [ ] Isolated Supabase Test project provisioned.
- [ ] Migrations executed on clean Test database.
- [ ] Live RLS role matrix passed.
- [ ] Complete Paymob Sandbox matrix passed.
- [ ] Test URL screenshots and responsive matrix passed.
- [ ] Remaining legacy lint warnings reduced in scoped batches.
- [ ] GitHub Actions passed for final pushed SHA.
- [ ] Production migration preflight performed.
- [ ] Explicit commercial release approval granted.

Production deployment and merge to `main` are prohibited at this stage.
