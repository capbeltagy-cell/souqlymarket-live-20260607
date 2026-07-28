# Souqly Payment Test Report

Date: 2026-07-28
Starting SHA: `aadbf268307d0590df24676f154ed27e433e5681`
Environment: local test build only; Production was not changed.

## Implemented boundary

- Payment amount and `EGP` currency are resolved server-side from the selected plan or order.
- Browser code cannot activate subscriptions.
- Paymob secrets remain server-only and payment is disabled unless explicitly enabled.
- Callbacks require SHA-512 HMAC verification.
- Verified events use a service-role-only atomic database RPC.
- Events and attempts have unique idempotency keys.
- Amount, currency, order/user binding, and replay are checked before settlement.
- Rejected events retain sanitized audit records without credentials or card data.

## Results

| Scenario | Result | Evidence |
| --- | --- | --- |
| Valid signed payload | PASS (unit) | HMAC/parser test |
| Altered signed payload | PASS (unit) | signature rejected |
| Missing/invalid fields | PASS (unit) | strict parser rejects |
| Invalid HMAC HTTP request | PASS (local runtime) | HTTP 401 |
| Invalid JSON HTTP request | PASS (local runtime) | HTTP 400 |
| Duplicate event key | PASS (unit/static) | deterministic key + unique DB constraint |
| Wrong amount/currency | PASS (static) | settlement RPC rejects mismatch |
| Client-side activation attempt | PASS (static) | subscription writes revoked |
| Full Sandbox payment | NOT RUN | Paymob Sandbox credentials unavailable |
| Live DB settlement/retry | NOT RUN | isolated Supabase Test project unavailable |
| Login → payment → webhook → persisted subscription | NOT RUN | both test services required |

## Actual models

Subscriptions use **one-month manual renewal**. Automatic recurring/tokenized billing is not claimed
or implemented. No card details are stored. Activation occurs only after a verified webhook.

Seller payouts use **manual approval and documented settlement** with `pending`, `approved`,
`processing`, `paid`, and `rejected` states. Overdraw, duplicate open requests, owner-side status
changes, and changing an in-use payout method are blocked. `paid` requires a reference and proof URL.

## Decision

Commercial payments remain **NO GO** until migrations pass on a clean isolated Supabase Test project
and the complete Paymob Sandbox matrix passes.
