# ALMA — Autonomous Business Office

ALMA is a bilingual operating system for founders, creators, solo operators,
and small businesses. It brings customers, conversations, work, money,
documents, approvals, reporting, and a permission-aware business assistant
into one workspace.

**Autnmous creates. ALMA operates.**

## Launch plans

- **ALMA Office — $39/month:** CRM, inbox, tasks, appointments, estimates,
  invoices, payments, bookkeeping preparation, receipts, reports, documents,
  rule-based automations, bilingual UI, and audit history. It makes no
  generative-AI calls.
- **ALMA AI — $199/month:** everything in Office plus metered AI assistance,
  drafting, extraction, summaries, suggestions, voice where configured, and
  approval-controlled autonomous actions.

## Local setup

1. Copy `.env.example` to `.env.local` and configure Supabase.
2. Run the migrations in `supabase/migrations` in timestamp order.
3. Run `npm ci`, then `npm run dev`.
4. Open `http://localhost:3000`.

Optional providers disable cleanly when their credentials are absent. Never put
the service-role key, Stripe secret, OAuth secrets, or OpenAI key in a public
environment variable.

## Verification

```bash
npm run check:encoding
npm run business-office:check
npm run managed-office:check
npm run sell-ready:check
npx tsc --noEmit
npm run lint
npm run build
```

## Production release

The guarded Windows release command validates ALMA, applies pending Supabase
migrations first, pushes `main`, deploys Vercel production, and performs smoke
checks:

```powershell
$env:SUPABASE_PROJECT_REF="YOUR_20_CHARACTER_PROJECT_REF"
npm run release:production
```

For a one-click GitHub release, configure the protected production environment
described in `docs/alma-autonomous-release.md`, then run **ALMA Production
Release** from GitHub Actions. Customers never run migrations or configure
owner secrets.

See `PRODUCT_SCOPE.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`,
`BILLING.md`, `QUICKBOOKS.md`, `AI_USAGE.md`, `DEPLOYMENT.md`, `TESTING.md`,
and `LAUNCH_CHECKLIST.md`.
