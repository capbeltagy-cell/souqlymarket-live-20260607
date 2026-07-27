# Souqly launch bundle rollback notes

The bundle is additive and does not delete business data. Always take a Supabase database backup immediately before applying it.

## If the transaction fails

`launch_bundle.sql` runs inside one transaction. PostgreSQL automatically rolls back the whole bundle when any statement fails. Copy the complete error, do not rerun individual statements, and verify that no open transaction remains in the SQL editor.

## If verification fails after commit

Do not remove tables or columns. Restore the pre-launch backup if service is affected. If only the new hardening must be disabled temporarily, use a reviewed maintenance script to:

1. Disable only the trigger directly involved in the incident. Launch triggers are
   `trg_recompute_store_coupon_used_count`, `audit_stores`, `audit_wholesale_orders`,
   `trg_protect_store_review_fields`, `trg_sync_company_owner_membership`,
   `trg_enforce_company_member_owner_role`, and `trg_enforce_listing_owner`.
2. Restore the previous `store_reviews_author_insert` policy from the migration history only after confirming the security impact.
3. Revoke execute on `consume_auth_rate_limit` instead of deleting `auth_rate_limits`; keeping its rows is harmless and preserves diagnostics.
4. Revoke execute on `adjust_company_inventory` or `accept_company_invitation` if one
   of those workflows is involved. Do not drop their tables or functions while the
   application may still reference them.
5. Roll the application back before changing Company Workspace policies. Existing
   `company_members`, invitations, CRM activities, locations, and movements may
   already contain launch-time records and must be preserved.

The new indexes and additive `leads` columns can remain in place during rollback.
They do not change existing data semantics. Avoid dropping `auth_rate_limits`,
Company Workspace, CRM, or inventory tables because they may contain useful records
or incident evidence.

The additive `listings.owner_id` column and its index should remain during an
application rollback. If the ownership trigger causes an incident, disable only
`trg_enforce_listing_owner` temporarily after rolling the application back; do not
clear or rewrite existing owner values.

Do not restore the metadata-driven version of `handle_new_user`: it permits a
public signup to request operational roles. If signup provisioning fails, fix the
specific profile/role constraint in a new migration while preserving the explicit
`company`, `agent`, and `customer` allowlist.

Direct `anon`/`authenticated` INSERT on `leads` is intentionally revoked because
the validated server function is the canonical creation path. If an undocumented
legacy client depends on direct writes, keep the application rolled back and
replace that path with a narrow validated RPC; do not restore the permissive
company/buyer/status spoofing policy.

Direct authenticated INSERT/UPDATE on `wholesale_orders` and direct INSERT on
`store_coupon_usage` are also intentionally revoked. Orders must be created through
`create_order_atomic` or `accept_quotation_atomic`, and status/payment updates run
through validated server functions. During an application rollback, roll back the
application and database backup together; do not restore the permissive direct
write policies independently.

`trg_record_released_order_inventory` records the compensating inventory movement
after the existing inventory trigger restores stock. If this logging trigger
fails, disable only that trigger after preserving the incident details; never
manually edit stock balances or delete inventory movement rows.

The Storage hardening migration only replaces UPDATE policies so that both the old
and new object paths must remain owner-scoped. Do not restore the previous
USING-only policies during an application rollback; they permit namespace changes
that the launch verification intentionally rejects.

## Safe recovery order

1. Put the application in Coolify maintenance mode or roll back to the previous image.
2. Restore the database backup if there is any uncertainty about partial manual changes.
3. Run `supabase/verify_launch.sql`, record the result, fix the bundle in a new commit, then reapply the full transaction.

## Actions that require explicit review

- Never delete owner rows inserted into `company_members` without first confirming
  the corresponding company ownership.
- Never reverse a stock movement by deleting it. Use a reviewed compensating
  movement through the inventory workflow after the application is healthy.
- Never change invitation hashes or accepted membership records manually.
- Do not run `DROP TABLE`, `DROP COLUMN`, or destructive cleanup as part of an
  emergency rollback. Restore the verified pre-launch backup instead.
