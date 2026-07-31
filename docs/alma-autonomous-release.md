# ALMA autonomous production release

ALMA customers never run migrations, configure owner credentials, or deploy
the application. Those are owner-only release operations.

## Immediate Windows release

After placing the updated source on `main`, run:

```powershell
$env:SUPABASE_PROJECT_REF="YOUR_20_CHARACTER_PROJECT_REF"
npm run release:production
```

The release command refuses to continue unless:

- the branch is `main`;
- the worktree is clean;
- `origin` is the approved `seaintCO/usaalma` repository;
- the focused product checks, TypeScript, and production build pass.

It then performs the critical operations in this order:

1. Validate the product.
2. Link the exact production Supabase project.
3. review and apply additive database migrations.
4. Push the verified `main` branch.
5. Deploy the verified revision to Vercel production.
6. Smoke-test the homepage and login.

This database-first ordering prevents a new application revision from showing
customers a “migration required” screen.

## GitHub one-click release

The **ALMA Production Release** workflow is intentionally manual. This prevents
an unreviewed push from changing the database or production site.

Create a protected GitHub environment named `production` and add:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_PROJECT_REF`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Then open **Actions → ALMA Production Release → Run workflow**. The same
validate → migrate → deploy order runs without local terminal work.

Do not enable a second automatic Vercel Git deployment for the same release
unless you intentionally accept duplicate deployments. The workflow should be
the authoritative release path.

## Provider activation

Migrations and deployments can be automated. Provider ownership cannot be
faked. Gmail, Outlook, QuickBooks, Stripe Connect, PayPal, WhatsApp, and
ElevenLabs require the corresponding owner app/OAuth credentials once. After
that setup, customers connect their own accounts inside ALMA and no longer need
owner intervention.

Missing optional credentials must remain a truthful disconnected state; ALMA
must never display demo data or a fake connected status in production.
