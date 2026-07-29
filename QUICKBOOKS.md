# QuickBooks Online

ALMA uses Intuit's OAuth authorization-code flow. Tokens are encrypted in the
existing provider-secret store; company authority and sync state are
workspace-scoped. Synchronization defaults to review mode and must never
silently overwrite confirmed accounting data.

Configure:

- `QUICKBOOKS_CLIENT_ID`
- `QUICKBOOKS_CLIENT_SECRET`
- `QUICKBOOKS_ENVIRONMENT=sandbox|production`
- `APP_ENCRYPTION_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Callback:

`<NEXT_PUBLIC_APP_URL>/api/connectors/oauth/quickbooks/callback`

The current connection flow stores realm/company identity and tokens safely.
Entity synchronization remains review-first and should be enabled incrementally
for customers, vendors, services, invoices, payments, and expenses after
sandbox reconciliation tests.
