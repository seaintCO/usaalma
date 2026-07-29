# ALMA Office customer payments

ALMA subscription billing and a customer's merchant account are separate
systems. `STRIPE_SECRET_KEY` bills the ALMA workspace subscription. Office
payment links use the workspace owner's connected Stripe or PayPal Business
account and never send customer invoice revenue to ALMA's subscription
account.

## Stripe

The owner chooses **Connections → Stripe → Connect** and completes Stripe
Connect OAuth. ALMA stores the connected account token in the encrypted,
server-only connector secret store. When the owner creates an invoice payment
link, ALMA creates a Checkout Session as a direct charge on that connected
account.

Configure:

- `STRIPE_CLIENT_ID`
- `STRIPE_SECRET_KEY`
- `STRIPE_CONNECT_WEBHOOK_SECRET`
- `APP_ENCRYPTION_KEY`
- `NEXT_PUBLIC_APP_URL`

The Stripe Connect webhook endpoint is:

`https://YOUR_DOMAIN/api/payments/webhooks/stripe`

Subscribe the Connect webhook to `checkout.session.completed` and
`checkout.session.async_payment_succeeded`.

## PayPal Business

The owner chooses **Connections → PayPal Business → Connect**, creates a REST
app in the official PayPal Developer dashboard, and enters that app's Client
ID and Secret. ALMA validates the credentials against PayPal before encrypting
them. The owner can use Sandbox first, then reconnect with Live credentials.

ALMA creates PayPal Orders using Orders v2. The customer approves payment on
PayPal. The signed, hash-bound return flow captures the order and reconciles it
to the original invoice.

## Reconciliation

A confirmed provider payment:

1. is recorded idempotently in `office_payment_events`;
2. marks `office_payment_links` paid;
3. marks the owned invoice paid; and
4. creates a confirmed operating-income record in `business_transactions`.

Amounts are checked against the original link. Raw public tokens are never
stored. Merchant credentials never reach client responses.

## Activation

Apply
`supabase/migrations/20260729003000_alma_office_payment_links.sql`, configure
the Stripe Connect webhook, redeploy, and run:

```bash
npm run office-payments:check
```

No provider should be shown as connected until the validation/OAuth flow
actually succeeds.
