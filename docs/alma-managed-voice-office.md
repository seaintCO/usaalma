# ALMA managed voice and office automation

## What this update enables

- Monthly and category budgets with 90% warnings and over-budget states.
- Invoice PDF email preparation through the unified Approval Center.
- Approved invoice delivery through a customer-connected Gmail or Outlook
  account.
- A one-time $299 managed voice-agent setup Checkout.
- A booking handoff for the managed setup call.
- Customer-owned ElevenLabs credentials and provider billing.
- A Home dashboard entry point for voice setup.

ALMA does not resell ElevenLabs or Twilio usage. Customers pay those providers
directly. The optional $299 charge is for ALMA onboarding and configuration
work.

## Required activation

Apply:

`supabase/migrations/20260729004000_alma_managed_voice_budgets_invoice_delivery.sql`

Configure the existing Stripe webhook endpoint to deliver
`checkout.session.completed`. Existing subscription events remain supported.

## Environment

- `STRIPE_PRICE_VOICE_AGENT_SETUP` is optional. When omitted, Checkout creates
  a one-time $299 line item.
- `ALMA_VOICE_SETUP_BOOKING_URL` should point to the owner's scheduling page.
- `ALMA_VOICE_SETUP_REQUIRED=true` blocks direct agent creation until a paid
  setup order exists. Leave it `false` to offer both managed and DIY setup.

Invoice email additionally requires a connected Gmail or Outlook account and
the existing connector OAuth variables. External email is never sent until the
user approves the prepared action.

## Provider responsibility

Customers are responsible for call recording consent, telemarketing rules,
AI disclosure, and their ElevenLabs/Twilio accounts. ALMA stores encrypted
provider credentials and accepts signed post-call webhooks under the existing
voice-agent architecture.
