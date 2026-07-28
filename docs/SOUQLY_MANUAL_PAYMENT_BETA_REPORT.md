# Souqly Manual Payment Beta Report

Date: 2026-07-28
Starting SHA: `ffe1a566c3f2f3edb4ebe9b9a76b958837e1a792`
Build: `souqly-manual-payment-beta-20260728`

## Implemented

- Paymob is hidden from user-facing pricing and order-payment screens; its server code remains.
- InstaPay and Vodafone Cash use destination `+201140949424`.
- Manual subscription checkout shows amount, method, destination, copy feedback and transfer steps.
- Submission requires sender phone, transfer time and JPG/PNG/WebP proof (maximum 5 MB).
- Optional reference and notes are validated.
- Proofs use a private bucket and owner-scoped paths.
- Users see only their requests and rejection reasons.
- Admin has a dedicated filtered queue with five-minute signed proof URLs.
- Approval atomically creates a paid transaction, activates/renews for one month, updates the company,
  writes subscription history, sends a notification and writes an audit record.
- Rejection requires a reason, sends a notification and permits a replacement request.
- Authenticated clients have no direct insert/update/delete permission on payment requests,
  payment transactions or subscriptions.

## Verification

- Clean install: PASS.
- TypeScript: PASS.
- Unit/static security tests: PASS (40/40).
- Migration static safety audit: PASS (79 files).
- Lint: PASS with zero errors; 325 legacy warnings remain.
- Production client build: PASS.
- Supabase Test execution: NOT RUN; no isolated Test project was provided.
- Browser visual session: NOT RUN; the available cloud browser blocks localhost.

## Beta decision

The code is suitable for a controlled Beta **after** the new migration is applied and verified on an
isolated Supabase Test project. It is not operational on the current environment until then.
