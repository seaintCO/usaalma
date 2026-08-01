# Deployment

1. Create a Supabase staging project and apply migrations in order.
2. Configure public Supabase values and server-only service-role value.
3. Configure Stripe test prices/webhook and optional provider OAuth apps.
4. Set `NEXT_PUBLIC_APP_URL` to the exact deployment origin.
5. Leave `ALMA_LEGACY_MODULES_ENABLED` unset.
6. Run all checks in `TESTING.md`.
7. Deploy a preview, complete authenticated bilingual smoke tests, then promote.

Optional integrations must report disconnected/configuration-required rather
than fall back to demo data. Never copy `.env.local` into a ZIP or deployment
image. Background workers belong on a persistent worker platform, not Vercel
request handlers.

The authoritative customer-onboarding and OAuth activation sequence is in
`docs/alma-production-activation.md`. Run `npm run onboarding:check` before
every production promotion.
