# Admin Phase 2 migration order

These migrations are repository artifacts only. Do not apply them to Production without explicit approval and a database backup.

1. `20260722013000_platform_admin_roles.sql`
2. `20260722013100_admin_core_user_role.sql`
3. `20260722013200_admin_core_permissions.sql`
4. `20260722020000_admin_phase_2_foundation.sql`

Before applying, validate the current `wholesale_orders`, `notifications`, `user_roles`, `role_permissions`, and `platform_settings` schemas in a staging clone. Apply in order, run RLS access tests for every platform role, and only then schedule Production deployment.

Rollback must be additive: disable new routes/features first and retain created tables for auditability. Do not drop tables containing moderation, dispute, notification, or audit records.
