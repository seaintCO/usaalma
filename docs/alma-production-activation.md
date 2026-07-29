# ALMA production activation

This checklist is for the ALMA account owner. Customers should never be asked
to run migrations, create OAuth applications, or paste server secrets.

## 1. Activate the database

Link the Supabase CLI to the production project and apply every committed
migration in timestamp order:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Windows owners can use the guarded helper instead:

```powershell
.\scripts\activate-alma-database.ps1 -ProjectRef YOUR_PROJECT_REF
.\scripts\activate-alma-database.ps1 -ProjectRef YOUR_PROJECT_REF -Apply
```

The first command is a dry run. The second links the exact project, applies
pending migrations, and runs the focused ALMA activation checks.

The Money workspace requires the Business Office schema. Bookkeeping, voice
agents, and Business Launch additionally require:

- `20260728001000_alma_business_office_refocus.sql`
- `20260729001000_alma_bookkeeping_voice_agents.sql`
- `20260729002000_alma_business_launch_center.sql`

Do not paste these commands into a customer-facing page. Confirm applied
migrations in Supabase before deploying the matching application revision.

## 2. Set the production origin

Set `NEXT_PUBLIC_APP_URL=https://www.seaintalma.com` in Vercel. ALMA derives
OAuth callback URLs from that exact origin and rejects non-HTTPS production
origins.

## 3. Configure Google OAuth

In the same Google Cloud project:

1. Configure the OAuth consent screen.
2. Enable the Gmail API.
3. Create a Web application OAuth client.
4. Add this exact authorized redirect URI:
   `https://www.seaintalma.com/api/connectors/oauth/gmail/callback`
5. Add the local URI only for development:
   `http://localhost:3000/api/connectors/oauth/gmail/callback`
6. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel.

The old `/api/oauth/google/start` route now redirects into this canonical,
workspace-scoped connector. Calendar and Drive must not be presented as
connected until their own scopes and production workflows are implemented.

## 4. Configure customer-payment connections

Set `STRIPE_CLIENT_ID` for Stripe Connect in addition to the existing Stripe
billing variables. Register this exact redirect URI in Stripe:

`https://www.seaintalma.com/api/oauth/stripe/callback`

Keep subscription billing and a customer's connected Stripe account separate.

## 5. Configure QuickBooks

Create an Intuit OAuth application and register:

`https://www.seaintalma.com/api/connectors/oauth/quickbooks/callback`

Set `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, and
`QUICKBOOKS_ENVIRONMENT`. Use `sandbox` until the complete review-first sync is
verified.

## 6. Voice-agent onboarding

Customers bring their own ElevenLabs API key inside `/voice-agents`; never ask
them to send it in support chat. ALMA encrypts the credential server-side,
creates the agent, issues signed conversation access, and accepts signed
post-call webhooks.

The owner must configure `APP_ENCRYPTION_KEY` and the public application origin
before offering voice setup. Telephone calling additionally requires the
supported phone-provider configuration shown inside the Voice Agent wizard.

## 7. Release gate

Run:

```bash
npm ci
npm run onboarding:check
npm run check:encoding
npm run business-office:check
npm run launch-office:check
npm run business-launch:check
npx tsc --noEmit
npm run lint
npm run build
```

Then complete a real authenticated mobile smoke test:

1. Create an account.
2. Finish `/onboarding`.
3. Open Money without seeing a schema warning.
4. Connect Gmail and return to ALMA.
5. Create one customer, transaction, estimate, and invoice.
6. Set up a test ElevenLabs voice agent.
7. Confirm every optional unconfigured provider displays an owner-setup state
   and never redirects to a malformed provider URL.
