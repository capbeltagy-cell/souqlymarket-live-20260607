# Souqly launch bundle rollback notes

The bundle is additive and does not delete business data. Always take a Supabase database backup immediately before applying it.

## If the transaction fails

`launch_bundle.sql` runs inside one transaction. PostgreSQL automatically rolls back the whole bundle when any statement fails. Copy the complete error, do not rerun individual statements, and verify that no open transaction remains in the SQL editor.

## If verification fails after commit

Do not remove tables or columns. Restore the pre-launch backup if service is affected. If only the new hardening must be disabled temporarily, use a reviewed maintenance script to:

1. Disable or remove only these triggers: `trg_recompute_store_coupon_used_count`, `audit_stores`, `audit_wholesale_orders`, and `trg_protect_store_review_fields`.
2. Restore the previous `store_reviews_author_insert` policy from the migration history only after confirming the security impact.
3. Revoke execute on `consume_auth_rate_limit` instead of deleting `auth_rate_limits`; keeping its rows is harmless and preserves diagnostics.

The new indexes can remain in place during rollback. They do not change data semantics. Avoid dropping `auth_rate_limits` because it may contain useful incident evidence.

## Safe recovery order

1. Put the application in Coolify maintenance mode or roll back to the previous image.
2. Restore the database backup if there is any uncertainty about partial manual changes.
3. Run `supabase/verify_launch.sql`, record the result, fix the bundle in a new commit, then reapply the full transaction.
