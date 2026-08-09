# Souqly 2.0 Route Map

## Canonical public information architecture

| Domain | Canonical route | Existing compatible routes |
|---|---|---|
| Home | `/` | `/how-it-works`, `/about`, `/faq` |
| Marketplace | `/marketplace` | `/categories`, `/categories/:slug`, `/listings/:id`, `/wholesale`, `/real-estate`, `/lands`, `/map` |
| Services | `/services` | Service listings remain compatible with `/listings/:id` and `/search-all` |
| Companies | `/companies` | `/companies/:id`, `/stores`, `/stores/:slug` |
| Factories | `/factories` | `/factories/:id` |
| RFQ | `/rfq` | `/rfq/:id`, `/rfq/new`, `/rfq/mine`, `/quotations/*` |
| Business solutions | `/business-solutions` | Existing business-suite marketing entry |
| Search | `/search-all` | `/search` retained for compatibility |
| Support/legal | `/contact`, `/faq` | `/terms`, `/privacy`, `/refund-policy` |
| Authentication | `/auth` | `/auth/callback`, `/forgot-password`, `/reset-password` |

## Authenticated target groups

- Account: `/dashboard`, `/profile`, `/favorites`, `/orders/*`, `/messages`, `/verification`.
- Workspace: `/company-center`, `/company`, `/store/*`, `/business-suite`, `/analytics`, `/leads`, `/invoices`.
- Growth: `/agent*`, `/campaigns/*`, `/marketing-center`, `/referrals`, `/commissions`, `/payouts`.
- Admin: current `/admin-*` routes and `/control-center-x7` remain compatible; a future `/admin/*` hierarchy must use redirects rather than deleting old paths.

## Compatibility policy

- Existing route files remain present in this reconstruction.
- Canonical routes are introduced before redirects.
- Redirects must preserve query parameters and safe `returnTo` values.
- Public, account, company-workspace and admin shells are separate security/navigation boundaries.
