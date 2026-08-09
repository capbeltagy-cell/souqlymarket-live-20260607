# Database Audit

## Evidence boundary

This audit combines the versioned migrations, generated types and a read-only inspection of production project `qujssmtdzmzsfrgtaitj` on 2026-08-09. No production data was changed.

## Confirmed production drift

- Production is `ACTIVE_HEALTHY` on PostgreSQL 17 in `eu-central-2`.
- The Supabase migration history API reports no tracked migrations, while the repository contains 88 ordered files.
- Production exposes 35 public tables plus `marketplace_stats`; later store, order, messaging, quotation, wallet and admin tables are not all live.
- Production contains 2 profiles and 2 role rows; inspected marketplace tables currently contain zero rows.
- Do not replay all repository migrations blindly. Verify a convergent reconciliation on a non-production branch first.

## Versioned schema inventory

| Object | Count | Notes |
|---|---:|---|
| Tables | 84 | Includes marketplace, organization, store, procurement, messaging, finance, moderation and business-suite domains |
| Views | 4 | `companies_trust`, `listings_public_contacts`, `marketer_leaderboard`, `public_profiles` |
| Functions | 83 | Includes authorization, atomic checkout, payments, inventory, notifications and audit helpers |
| Policies | 237 | Parsed from versioned migrations; live enabled/disabled state unverified |
| Triggers | 83 | Ownership, audit, lifecycle, financial and notification triggers |
| Enums | 17 | Roles and domain state machines |
| Migrations | 88 | Migration safety audit passes: ordered files and no destructive data DDL |

## Tables by domain

- Identity/access: `profiles`, `user_roles`, `role_permissions`, `user_activity`, `auth_rate_limits`.
- Organizations: `companies`, `company_profiles_extra`, `company_members`, `company_invitations`, `factories`.
- Marketplace: `business_categories`, `listings`, `favorites`, `reviews`, `leads`.
- Store: `stores`, `store_categories`, `store_staff`, `store_followers`, `store_reviews`, `store_coupons`, `store_coupon_usage`.
- Procurement: `rfqs`, `rfq_offers`, `quotations`, `quotation_items`, `tenders`, `tender_proposals`.
- Commerce: `wholesale_listings`, `wholesale_orders`, `admin_order_status_history`.
- Messaging: `conversations`, `messages`, `notifications`, `notification_templates`, `notification_broadcasts`, `notification_delivery_logs`.
- Finance: `payments`, `payment_transactions`, `payment_events`, `payment_methods`, `payment_proofs`, `invoices`, `wallets`, `wallet_transactions`, `payout_methods`, `payout_requests`, `payout_events`, `company_deposits`, `manual_payment_requests`, `subscriptions`, `subscription_events`.
- Affiliate/growth: `agents`, `agent_applications`, `agent_campaigns`, `agent_landing_pages`, `agent_achievements`, `referrals`, `company_referrals`, `commissions`.
- Business suite: `crm_contacts`, `crm_activities`, `inventory_items`, `inventory_locations`, `inventory_movements`, `business_suppliers`, `business_invoices`, `business_invoice_items`, `business_sales_orders`, `business_sales_order_items`, `business_purchase_orders`, `business_purchase_order_items`.
- Trust/admin: `audit_logs`, `moderation_reports`, `moderation_actions`, `moderation_notes`, `order_disputes`, `dispute_notes`, `admin_notes`, `platform_settings`, `platform_settings_history`, `launch_import_batches`.

## Enums

`app_role`, `application_status`, `campaign_status`, `commission_status`, `company_member_role`, `invoice_status`, `listing_status`, `listing_type`, `payment_proof_status`, `payout_status`, `quotation_status`, `store_coupon_type`, `store_status`, `store_sub_status`, `subscription_plan`, `wallet_kind`, `wallet_tx_reason`.

## High-risk functions requiring live verification

- Authorization: `has_role`, `has_permission`, `has_company_permission`, `is_platform_admin`, `owns_company`.
- Checkout/inventory: `create_order_atomic`, `sync_paid_order_inventory`, `record_released_order_inventory`, `adjust_company_inventory`.
- Payments: `process_verified_paymob_event`, `validate_order_payment_proof`, `review_manual_subscription_payment`, `release_order_escrow`.
- Procurement: `accept_quotation_atomic`.
- Privilege protection: all `protect_*_privileged_*` functions.

## Required before any production migration

1. Verified logical backup using session pooler.
2. Read-only live schema export and migration-history comparison.
3. Live RLS, grants, function execute privileges, triggers, enums and bucket inventory.
4. Restore rehearsal into a non-production database.
5. Only forward, idempotent, reviewed migrations; never reset production.
