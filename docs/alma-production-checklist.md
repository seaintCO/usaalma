# ALMA public sandbox and billing production checklist

## Before cutover

- Apply migrations in timestamp order through `20260720002000_alma_subscription_authority.sql`; verify subscription uniqueness, RLS, webhook-ledger isolation, and workspace foreign keys.
- Create the two monthly Stripe prices and configure Customer Portal behavior in test mode first.
- Configure required Stripe, Supabase, and app URL variables in each Vercel environment.
- Register the webhook URL and required events, then verify signature rejection and ledger processing.
- Run the public billing check, milestone checks, typecheck, lint, build, and Playwright.
- Complete approved test-mode Checkout, Portal plan change, cancellation, renewal, failed-payment, duplicate-event, and delayed-webhook exercises.
- Confirm Essential and Autonomous accounts see canonical module states after refresh and a fresh login.

## Production cutover

Create live products/prices separately, replace only production environment values, register a live webhook endpoint, deploy validated code and schema, and complete one authorized low-risk production purchase. Monitor failures without logging payloads or payment data.

## Rollback

Disable purchase CTAs by removing the two price environment variables, leaving subscriptions and data intact. Roll application code forward with a corrective release; do not rewrite migration history or delete webhook ledger rows.

## Known boundaries

Provider-dependent modules additionally require credentials, connection verification, usage allowance, and approval policy. The sandbox never validates providers. No migration, Stripe console mutation, Vercel mutation, or live charge is performed by repository tests.
