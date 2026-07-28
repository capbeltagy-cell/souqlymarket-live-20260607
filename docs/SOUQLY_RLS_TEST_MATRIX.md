# Souqly RLS Test Matrix

Date: 2026-07-28

No isolated Supabase Test project or test credentials were available. No row is represented as a
live database PASS. Static policy/migration checks passed, but the matrix must run before Production.

| Resource | Visitor | Owner | Other user/company | Marketer | Admin | Live |
| --- | --- | --- | --- | --- | --- | --- |
| profiles | public only | own permitted fields | no private fields | no private fields | governed access | NOT RUN |
| companies | approved only | own writes | denied | assigned scope | moderation | NOT RUN |
| stores | approved only | own writes | denied | denied | moderation | NOT RUN |
| products/listings | approved only | own drafts/writes | no drafts | assigned scope | moderation | NOT RUN |
| agents/leads | denied/scoped | own scope | denied | assigned scope | admin scope | NOT RUN |
| rfqs/tenders | published only | own scope | no private bids | assigned scope | admin scope | NOT RUN |
| notifications | denied | own rows | denied | own rows | targeted operations | NOT RUN |
| commissions | denied | own permitted view | denied | own earnings | admin scope | NOT RUN |
| payouts/methods | denied | own request/read | denied | own rows | transition RPC | NOT RUN |
| payment proofs | denied | scoped parties | denied | denied | admin scope | NOT RUN |
| subscriptions | denied | own read, no write | denied | denied | service flow | NOT RUN |
| payment events | denied | safe own-status RPC | denied | denied | service role | NOT RUN |
| admin-only tables | denied | denied | denied | denied | role checked | NOT RUN |

Required negative tests include cross-user private reads, cross-company writes, reading another
marketer's earnings, visitor access to drafts, user approval/status changes, admin RPC calls,
cross-user payout/payment reads, and deletion of content not owned by the caller. Every attempt must
fail at both server and database layers.
