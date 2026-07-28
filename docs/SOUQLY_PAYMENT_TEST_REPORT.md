# Souqly Payment Test Report

Status: **NOT READY FOR PAYMOB PRODUCTION**

## Current implementation

- Orders, payment methods, payment proofs and admin review interfaces exist.
- The current buyer flow submits payment proof for manual review.
- Subscription copy and activation remain manual in the current repository.
- No complete Paymob intent, redirect, HMAC callback and reconciliation implementation was found.

## Paymob sandbox cases

| Scenario | Result |
|---|---|
| Create intent/order | NOT TESTED — credentials/integration absent |
| Success callback | NOT TESTED |
| Failure/cancel callback | NOT TESTED |
| Invalid HMAC | NOT TESTED |
| Duplicate/replay callback | NOT TESTED |
| Wrong amount/currency | NOT TESTED |
| Automatic activation | NOT IMPLEMENTED/VERIFIED |
| Automatic renewal/cancellation | NOT IMPLEMENTED/VERIFIED |

No real money was used and no Production payment state was changed.

## Release decision

Payments must remain classified as manual proof review until Paymob Sandbox passes all callback, idempotency, amount, currency and authorization cases.
