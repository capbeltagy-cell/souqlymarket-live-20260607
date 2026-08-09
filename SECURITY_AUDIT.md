# Security Audit

## Baseline result

- Static boundary tests: PASS.
- Payment boundary tests: PASS.
- Admin/moderation permission tests: PASS.
- Migration destructive-DDL audit: PASS.
- Live Supabase advisors: COMPLETED read-only; remediation changes remain gated.

## Confirmed controls in code/migrations

- Browser client uses publishable key variables only.
- Service-role client is isolated in `client.server.ts` and reads non-`VITE_` environment variables.
- Authenticated parent route calls `supabase.auth.getUser()` and redirects unauthenticated users.
- Role and permission helpers exist in database and application code.
- Private payment-proof buckets have owner/admin policies in versioned migrations.
- Atomic order and payment functions have regression tests.

## Findings requiring remediation or live validation

| Priority | Finding | Required action |
|---|---|---|
| Critical gate | Repository and production migration histories are not reconciled | Rehearse a convergent migration on a development branch before production DDL |
| High | `marketplace_stats` is reported as a security-definer view | Apply the prepared `security_invoker` migration after explicit approval |
| High | A legacy `convert_referral` overload accepts a caller-supplied converted user | Keep this overload service-only using the prepared reconciliation migration |
| High | 83 parsed functions include privileged financial/authorization code | Audit `SECURITY DEFINER`, `search_path`, grants and internal auth checks live |
| High | 237 policies may contain legacy broad rules | Test anon/authenticated/owner/staff/admin matrices against live schema |
| High | Signup sends requested role through user metadata | Ensure trigger treats it only as onboarding intent; authorization must come from protected `user_roles`/app metadata |
| Medium | 326 lint warnings and many unsafe casts | Replace route query casts with typed adapters and Zod validation gradually |
| Medium | Legacy views must enforce caller permissions | Confirm `security_invoker=true` or revoke Data API access where appropriate |
| Medium | Storage upsert needs SELECT+INSERT+UPDATE | Verify each writable bucket policy set and ownership path convention |
| High | Two high-severity transitive dependency advisories | Update `js-yaml` and `nanoid` through the lockfile, then rerun audit and full tests |

## Non-negotiable rules

- Never expose `service_role`/secret keys in Vite variables.
- Never use user-editable metadata for authorization.
- Never add `SECURITY DEFINER` to bypass an RLS failure.
- Every exposed table needs explicit grants plus RLS.
- Every update policy needs appropriate SELECT, `USING` and `WITH CHECK` behavior.
- Storage metadata is read-only; object mutations go through Storage APIs.

## Billing hardening update

- Manual payment numbers are no longer compiled into application code.
- Only the server-side service client writes payment-method configuration after an authenticated admin-role check.
- Checkout reads active payment methods and snapshots the selected destination into each request.
- User-supplied amount, destination and approval state are never accepted by the submission RPC.
- Approval locks the request and is idempotent before activating a subscription.
- Manual-payment `SECURITY DEFINER` functions are migrated to `search_path = ''`.
- Production advisors were inspected and findings are documented; no zero-finding claim is made.
