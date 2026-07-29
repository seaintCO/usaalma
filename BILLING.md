# Billing

Stripe is authoritative for subscription lifecycle; server-side entitlements
are authoritative inside ALMA.

- `office` maps to canonical `starter` / ALMA Office.
- `ai` maps to canonical `business` / ALMA AI.

Required variables:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_OFFICE_MONTHLY`
- `STRIPE_PRICE_AI_MONTHLY`
- `NEXT_PUBLIC_APP_URL`

Legacy price aliases remain accepted during cutover. Validate Checkout, Portal,
renewal, failed payment, cancellation, webhook replay, and out-of-order events
in Stripe test mode before production.
