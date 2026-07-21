# ALMA public sandbox and billing audit

Date: 2026-07-20

## Reuse

- `app/page.tsx` remains the only active public route. The canonical locale contract remains `useAlmaLocale`, the `alma_locale` cookie, and the `alma_language` compatibility key.
- Auth remains Supabase SSR/client auth through the existing login, signup, and `getCurrentUser` paths.
- `public.subscriptions`, `SubscriptionRepository`, and `EntitlementService` remain the billing and plan-access sources of truth.
- Stripe remains server-only through `lib/stripe/server.ts`; Checkout, Portal, status, plans, history, and webhook route locations are retained.
- The module registry remains the canonical plan-to-module catalog. Tenant resolution remains `resolveTenantWorkspace`.

## Repair or replace

- The homepage duplication is caused by `app/page.tsx` rendering a complete static hero and then appending the independent `AlmaHeroReplay` hero. `AlmaPricingTabs` is imported but unused. The legacy `src/app` tree is historical and is not the active App Router root. The public route will be replaced by one composed sandbox.
- The replay component claims live/connected/generating behavior and auto-runs decorative scenarios. It will be replaced with a deterministic, anonymous, in-memory state machine that performs no network mutation or provider call.
- Public page strings use an isolated locale state and legacy dictionaries. They will move to the canonical locale hook with complete EN/ES parity.
- Public Essential and Autonomous names map to existing internal `starter` and `business` identifiers. Compatibility aliases remain readable; Stripe price IDs stay server-only.
- Checkout currently lacks safe auth continuation, workspace metadata, structured readiness, and duplicate-click idempotency. These will be added to the existing route.
- Webhooks verify the raw body correctly but have no event ledger or ordering guard and omit `invoice.paid`. Reconciliation will be centralized and persisted through an additive migration.
- The repository reads only a subset of billing state. It will expose period, cancellation, trial, payment-failure, and synchronization fields without trusting success-page parameters.
- Billing uses an isolated language fetch and incomplete plan labels. It will consume canonical locale and show only persisted or Stripe-confirmed facts.
- `requirePaidUser` is a coarse subscription gate. Module-specific enforcement will continue through `EntitlementService`; new helpers and contract checks will prevent UI-only access claims.

## Remove

- The duplicated static/replay homepage composition and legacy public marketing dictionaries are removed from the active render path.
- Fake live, connected, sent, generated, or deployed demo states are not retained.

## Provider boundary

No migration is applied and no Stripe product, price, customer, Checkout, Portal, webhook endpoint, charge, or Vercel setting is mutated by this work. Deterministic tests cover code behavior. A live test-mode pass remains a manual production-readiness step when approved credentials and migrated schema are available.
