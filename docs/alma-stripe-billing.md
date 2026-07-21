# ALMA Stripe billing

## Architecture

`public.subscriptions` remains the authoritative compatibility row. Stripe webhooks are authoritative for plan and status changes; the success page only polls persisted state. `stripe_webhook_events` provides event idempotency, and `last_stripe_event_created` rejects older state changes.

Required server configuration:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ESSENTIAL_MONTHLY`
- `STRIPE_PRICE_AUTONOMOUS_MONTHLY`
- `NEXT_PUBLIC_APP_URL`
- Supabase public configuration and `SUPABASE_SERVICE_ROLE_KEY`

Legacy price names remain fallback-only for compatibility. Price IDs never enter client code.

## Stripe setup

1. In Stripe test mode, create recurring monthly Essential ($99) and Autonomous ($399) prices.
2. Set the two price environment variables to those test price IDs.
3. Configure the Customer Portal for plan changes and cancellation.
4. Register `https://<host>/api/billing/webhook` for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`.
5. Store the signing secret as `STRIPE_WEBHOOK_SECRET`.

For local testing, use `stripe listen --forward-to localhost:3000/api/billing/webhook` and test-mode payment methods only. Never reuse a live signing secret locally.

Checkout associates the authenticated user and resolved workspace through metadata, reuses an owned Stripe customer, and uses a scoped idempotency key. Existing subscribers are directed to the Portal. Portal sessions can only use the customer ID read from the authenticated user's subscription row.

## Provider boundary

The migration and Stripe/Vercel configuration are not applied by repository validation. A test-mode Checkout, signed webhook delivery, Portal change, failed payment, renewal, and cancellation must be verified after approved configuration.
