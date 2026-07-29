# Security

- Supabase Auth identifies users; workspace membership scopes tenant access.
- RLS protects user and workspace records.
- Service-role, provider, Stripe, and OAuth credentials are server-only.
- Provider tokens are encrypted at rest.
- OAuth uses signed, expiring, HttpOnly state cookies.
- External messages and sensitive actions pass through approvals.
- Stripe and messaging webhooks require signature verification and
  idempotency.
- Financial numbers come from stored records; ALMA must not invent values.
- Production fails closed when required configuration is missing.
- Uploaded files must be type/size checked and served with short-lived URLs.

Before launch, perform cross-tenant IDOR tests, webhook replay tests, upload
tests, OAuth callback tests, and an audit-log review.
