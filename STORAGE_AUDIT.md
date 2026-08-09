# Storage Audit

## Buckets referenced by versioned migrations

| Bucket | Intended content | Access expectation |
|---|---|---|
| `avatars` | User avatars | Public read; owner-folder writes |
| `company-assets` | Logos, covers and company media | Public read; owner-folder writes |
| `company-catalogs` | Company catalogue documents | Authenticated/public behavior must be confirmed live; owner-folder writes |
| `listing-media` | Product/listing images | Public read; owner-folder writes |
| `rfq-attachments` | Procurement documents | Stakeholder read; buyer/owner writes |
| `payment-proofs` | Order payment proof | Private; buyer and authorized reviewer only |
| `manual-payment-proofs` | Subscription proof | Private; owner and authorized reviewer only |

## Audit boundary

Live read-only verification confirmed `avatars`, `company-assets`, `company-catalogs`, `listing-media`, `partner-assets`, `payment-proofs` and `rfq-attachments`. `payment-proofs` is private; the other current buckets are public. Existing objects: 6 in `company-assets` and 7 in `listing-media`. No bucket or object was changed.

## Required live checks

1. Compare `storage.buckets` with this inventory.
2. Inspect SELECT/INSERT/UPDATE/DELETE policies on `storage.objects`.
3. Confirm folder prefix ownership and stakeholder access.
4. Confirm proof buckets cannot be listed or read anonymously.
5. Confirm upload size and MIME validation in both UI and bucket configuration.
