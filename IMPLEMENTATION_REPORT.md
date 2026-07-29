# ALMA Autonomous Business Office — Implementation Report

## 1. Executive summary

ALMA has been refocused from a broad application marketplace into a bilingual
autonomous business office for founders, creators, solo operators, and small
businesses. The active experience now centers on customers, conversations,
work, money, automations, the ALMA assistant, business knowledge, and reports.

The implementation preserves the existing authentication, workspace tenancy,
CRM, communications, tasks, documents, estimates, invoices, approvals,
connectors, billing, AI routing, usage control, and audit foundations.

## 2. Product direction implemented

- Positioning: **Autnmous creates. ALMA operates.**
- Primary customer promise:
  1. Talk to customers.
  2. Manage the work.
  3. Track the money.
  4. Let ALMA assist or automate it.
- One platform with Business, Creator, and Creator + Business onboarding modes.
- English and Spanish public positioning, pricing, onboarding, shell, and core
  business routes.

## 3. Modules deactivated

The following legacy experiences are excluded from production navigation,
onboarding, product positioning, and active entitlements by default:

- Builder and website/app generation
- Creative, image, launch, and presentation studios
- Trading
- Fitness
- Construction takeoff

Their source is retained for migration safety. Setting
`ALMA_LEGACY_MODULES_ENABLED=true` explicitly re-enables legacy route access.

## 4. Navigation and dashboard

Desktop navigation:

- Home
- Customers
- Inbox
- Work
- Money
- Automations
- ALMA
- Knowledge
- Reports

Mobile navigation:

- Home
- Inbox
- ALMA
- Customers
- More

The dashboard is now a real-data morning business briefing using existing
workspace summary and approval sources. Marketplace tiles and invented business
metrics are not used.

## 5. Database changes

Additive migration:

`supabase/migrations/20260728001000_alma_business_office_refocus.sql`

It adds workspace-scoped foundations for:

- Business profiles and onboarding modes
- Transactions and bookkeeping review
- Receipts and private receipt storage
- Appointments
- Payroll-preparation people and periods
- Tax-readiness checklists
- QuickBooks connection authority and sync logs
- Workspace autonomy settings

The migration includes ownership checks, indexes, constraints, timestamps, and
row-level security. It has not been applied to any remote database.

## 6. Core system status

### Fully working in source and deterministic validation

- Simplified product shell and mobile navigation
- Public bilingual interactive sandbox
- Office and AI pricing presentation
- Canonical module visibility and entitlement mapping
- Business/Creator/Both onboarding persistence
- Customer/CRM route
- Unified inbox route
- Work hub
- Money overview and transaction CRUD API
- Reports hub
- Automations hub
- Knowledge hub
- Existing Tasks, Planner, Notes, Documents, Estimates, Invoices, Approvals,
  communications, AI modes, and usage-control foundations
- Production build with 247 generated routes/pages

### Working but requiring external credentials or configuration

- Stripe checkout, portal, and webhook lifecycle
- Gmail and Outlook OAuth
- WhatsApp Business connection and messaging
- QuickBooks OAuth and company connection
- OpenAI responses, translation, audio, vision, and document analysis
- Builder runtime retained outside the active product

### Partially implemented

- Bookkeeping preparation has transaction CRUD, real aggregation, review
  statuses, receipt schema, payroll-preparation schema, tax-readiness schema,
  and reporting foundations. Full receipt UI, imports, matching, split
  transactions, accountant export, and all report drill-downs remain future
  work.
- QuickBooks has official OAuth, encrypted token persistence through the
  existing connector secret architecture, refresh handling, connection status,
  disconnect, company verification, and sync-log schema. Entity synchronization
  is intentionally not claimed until live credentials and mapping tests exist.
- Payroll and tax features are preparation systems only, not processing,
  filing, accounting, or professional advice.

### Intentionally excluded

- Image/video/presentation generation
- Website/application generation
- Trading and fitness
- Construction takeoff
- Full payroll processing
- Tax filing
- CPA, legal, banking, or regulated-professional claims

## 7. AI entitlement and cost control

- Office is mapped to the canonical non-AI `starter` entitlement.
- AI is mapped to the canonical `business` entitlement.
- Provider access remains enforced server-side.
- Existing atomic usage reservations, settlement, release, idempotency,
  concurrency, plan limits, and mode routing remain active.
- The product does not need AI for arithmetic, metrics, task filtering,
  transaction totals, deterministic reports, or rules.

## 8. Billing

Launch plans:

- ALMA Office — $39/month
- ALMA AI — $199/month

Stripe price IDs remain environment-configured. Existing authoritative checkout,
portal, webhook event ledger, subscription synchronization, failed-event retry,
and out-of-order event protection remain in place.

## 9. Security

- Existing workspace resolution and row-level security are preserved.
- New business-office tables are workspace/user scoped.
- QuickBooks uses signed OAuth state, PKCE where supported by the shared flow,
  encrypted secret storage, official endpoints, and server-only tokens.
- No provider secrets are returned to clients.
- Legacy modules fail closed by default.
- No anonymous public sandbox workflow calls an API or provider.
- High-risk external actions remain behind the existing approval boundary.

## 10. Validation completed

Passed:

- `npm run check:encoding`
- `npm run business-office:check`
- `npm run public-billing:check`
- `npm run milestone6:check`
- `npm run milestone7:check`
- `npm run usage:check`
- `npx tsc --noEmit`
- `npm run lint` (zero errors; existing warnings remain)
- `npm run build` with non-secret public build placeholders
- `git diff --check`

The initial production build correctly failed without public Supabase
configuration. The full source build then passed with non-secret placeholder
public values, confirming that a real deployment must provide the documented
Supabase environment variables.

## 11. Environment and credentials still required

Core:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_ENCRYPTION_KEY`
- `CHAT_RUN_WORKER_SECRET`

Billing:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_OFFICE_MONTHLY`
- `STRIPE_PRICE_AI_MONTHLY`

AI:

- `OPENAI_API_KEY`
- Model variables documented in `.env.example`

QuickBooks:

- `QUICKBOOKS_CLIENT_ID`
- `QUICKBOOKS_CLIENT_SECRET`
- `QUICKBOOKS_ENVIRONMENT`
- `QUICKBOOKS_SCOPES`

Messaging providers require their own credentials and callback configuration as
documented in `.env.example` and the connector documentation.

## 12. Exact owner launch checklist

1. Review this source package in a new branch.
2. Back up the target Supabase database.
3. Apply unapplied additive migrations in timestamp order.
4. Configure production environment variables from `.env.example`.
5. Create Stripe Office and AI monthly prices and set their IDs.
6. Register the production Stripe webhook and set its signing secret.
7. Configure QuickBooks, email, and WhatsApp callbacks only for providers being
   launched.
8. Run the validation commands in this report.
9. Perform authenticated tenant-isolation, billing, invoice, estimate,
   transaction, and provider smoke tests in a non-production workspace.
10. Deploy a preview, verify English/Spanish and mobile behavior, then promote
    that exact verified commit to production.

Do not claim a provider is connected until its live/test OAuth and lifecycle
tests have succeeded.

