# ALMA overnight build report

## Program status

**Stage 1 (Billing) completed locally — 2026-07-15.**

### Initial audit and unblocking evidence

The source audit initially found no checked-in schema migration defining the
canonical `public.subscriptions` table. Live Supabase inspection then confirmed
the existing table already includes `status`, `plan`, `stripe_customer_id`,
`stripe_subscription_id`, `price_id`, and `current_period_end`. The existing
table is therefore the sole billing source of truth; no subscriptions migration
was created.

### Stage 1 implementation

- The Billing workspace reads current plan, lifecycle status, renewal or end
  date, and access requirements only from `subscriptions`.
- Authenticated price discovery exposes only actual configured Stripe Price
  details. It does not fabricate amounts or plan labels.
- Checkout is used for a subscriber without a Stripe customer. Existing Stripe
  customers use the Stripe Customer Portal for plan and lifecycle changes.
- Payment history lists only invoices returned for the authenticated user's
  canonical subscription customer.
- The checkout-success page follows the normalized billing status contract.
- The Stripe webhook now reconciles `subscriptions` through the server-only
  Supabase admin client using the existing `user_id` conflict key.
- ALMA platform billing remains separate from user-connected Stripe business
  accounts in `oauth_connections`; Stripe Connect code was not changed.
- The Billing UI has English and Spanish copy plus loading, error, empty, and
  unauthenticated-safe states.

No runtime code, migration, deployment configuration, secret, or production
resource was changed outside this local checkpoint. The pre-existing uncommitted
`supabase/migrations/20260715013000_alma_ai_workspace_closeout.sql` change was
left untouched.

### Local validation

- `npx prettier --check` passed for all Billing files.
- `npx tsc --noEmit` passed.
- Targeted ESLint passed without errors.
- `npm run build` passed.
- `git diff --check` passed.

### External verification still required

- Configure Stripe platform billing prices and the signed webhook endpoint.
- Verify Checkout, Customer Portal, and invoice history in a non-production
  Stripe/Supabase environment using a real test customer.
- Confirm the live `subscriptions.user_id` uniqueness constraint required by the
  existing `upsert(..., { onConflict: "user_id" })` reconciliation contract.
