# Permissions Audit

## Roles and scopes

| Scope | Sources of truth | Expected boundary |
|---|---|---|
| User identity | Supabase Auth `auth.users` | Session/user validation only |
| Platform role | `user_roles`, `app_role`, `has_role()` | Admin/company/agent routing and RLS |
| Fine permission | `role_permissions`, `has_permission()` | Administrative actions |
| Company membership | `company_members`, `company_member_role`, `has_company_permission()` | Company workspace tenant boundary |
| Store ownership/staff | `stores`, `store_staff` | Store operations only |
| Procurement stakeholder | RFQ/quotation buyer and supplier links | RFQ, offer and attachment access |
| Financial ownership | wallet/payment/order owner plus platform admin | No cross-tenant financial access |

## Application guards

- `/_authenticated` validates the current user using `getUser()`.
- `AdminLayout`, `admin-permissions.ts`, `PermissionGate` and moderation guards protect privileged UI.
- UI guards are not a replacement for RLS/RPC authorization.
- `user_metadata.role` is accepted only as signup intent; live trigger behavior must be verified.

## Test matrix required

For each sensitive table/RPC: anon, authenticated non-owner, owner, company staff, company owner, agent, admin. Test SELECT/INSERT/UPDATE/DELETE separately and verify ownership fields cannot be reassigned.
