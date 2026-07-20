# Alma Connector Setup

Milestone 4 adds the secure connector foundation for Gmail and Outlook email delivery. QuickBooks, Stripe Connect, and WhatsApp Business are represented in the connector architecture but are not operational in this milestone.

## Required Environment

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key for authenticated app requests.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase key used by connector repositories. Required because encrypted token rows are not client-readable.
- `APP_ENCRYPTION_KEY`: server-only key used for OAuth state signing and AES-GCM token encryption.
- `NEXT_PUBLIC_APP_URL`: canonical app origin used to construct OAuth callback URLs.
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`

Never expose provider client secrets, refresh tokens, access tokens, `APP_ENCRYPTION_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` through `NEXT_PUBLIC_` variables.

## Google Setup

Create a Google OAuth web application and enable the Gmail API.

Scopes requested:

- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/gmail.send`

Callback URLs:

- Local: `http://localhost:3000/api/connectors/oauth/gmail/callback`
- Preview: `https://<vercel-preview-domain>/api/connectors/oauth/gmail/callback`
- Production: `https://<production-domain>/api/connectors/oauth/gmail/callback`

The implementation uses the OAuth authorization-code flow with signed state and PKCE. Tokens are exchanged server-side and stored encrypted in `provider_connection_secrets`.

## Microsoft Setup

Create a Microsoft Entra application using delegated Graph permissions.

Scopes requested:

- `openid`
- `email`
- `profile`
- `offline_access`
- `User.Read`
- `Mail.Send`

Callback URLs:

- Local: `http://localhost:3000/api/connectors/oauth/outlook/callback`
- Preview: `https://<vercel-preview-domain>/api/connectors/oauth/outlook/callback`
- Production: `https://<production-domain>/api/connectors/oauth/outlook/callback`

The implementation uses the Microsoft identity platform authorization-code flow with signed state and PKCE. Outlook send uses Microsoft Graph `POST /me/sendMail`.

## Security Model

- `provider_connections` stores safe public connection metadata only.
- `provider_connection_secrets` stores encrypted tokens and is revoked from `anon` and `authenticated`.
- Route handlers use server-side repository methods only.
- Tokens are never returned to client components.
- Disconnect deletes token secrets and marks metadata disconnected.
- Connector sends fail closed if server credentials are missing.

## Runtime Behavior

- `/connections` displays Gmail and Outlook with simple states: not connected, connected, expired, reauthorization required, configuration required, and error.
- Office estimate delivery creates an approval before any external send.
- Approved Office delivery revalidates the estimate, workspace, connector status, and token before sending.
- Estimates become `sent` only after the provider send call succeeds.
- Follow-up intent can be stored with a due time, but reply detection is not claimed or implemented because inbox-read scopes are intentionally not requested.
