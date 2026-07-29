# ALMA Voice Agents

## Commercial model

ALMA Voice Agents uses a customer-owned provider model:

- the customer opens and owns an ElevenLabs account;
- the customer creates a restricted ElevenLabs API key;
- the customer optionally owns a Twilio account and phone number;
- ElevenLabs and Twilio charge the customer for their provider usage;
- ALMA can charge a one-time implementation fee and a recurring fee for the
  secure setup wizard, CRM attachment, workflows, reporting, support, and
  management.

This avoids reselling unpredictable phone and model usage. A practical launch
offer is a scoped setup fee plus an ALMA Voice add-on, while provider usage is
billed directly by the provider. Final pricing should be tested against support
load and the provider usage of real customers.

## Why this is BYOK, not OAuth

ElevenLabs agent provisioning uses an API key. That key is not an OAuth grant.
ALMA therefore must not show a misleading "Sign in with ElevenLabs" flow.

The connection form accepts the key only inside authenticated ALMA, validates
it server-side, encrypts it using the existing connector secret architecture,
and never returns it to the browser. Keys must never be pasted into support
chat, committed, logged, or stored in a public environment variable.

## Customer setup

1. Open `/voice-agents` in ALMA.
2. Create an ElevenLabs API key in the customer's ElevenLabs dashboard.
3. Create a post-call webhook secret in ElevenLabs.
4. Paste both values into ALMA's secure connection form.
5. Copy ALMA's workspace webhook URL into ElevenLabs post-call webhooks.
6. Create the receptionist, assistant, or transcription agent in ALMA.
7. Test a signed browser conversation.
8. For telephone calls, obtain an active Twilio number, import it into
   ElevenLabs, and assign it to the agent.
9. Make a test call and confirm the signed transcript appears in ALMA CRM.
10. Review recording consent, AI disclosure, telemarketing, and retention rules
    for every jurisdiction in which the customer operates.

## Implemented behavior

- customer-managed encrypted ElevenLabs credentials;
- server-side API key validation;
- agent creation through the official ElevenLabs SDK;
- receptionist, assistant, and transcriber templates;
- English, Spanish, and bilingual configurations;
- short-lived signed browser conversation URLs;
- microphone conversation UI;
- signed raw-body post-call webhook verification;
- idempotent webhook ledger;
- transcript, summary, outcome, phone, duration, and status storage;
- normalized-phone CRM contact matching;
- optional new-lead creation;
- CRM activity history;
- tenant isolation and plan entitlement checks;
- no model call during webhook ingestion.

## Current provider boundary

Twilio phone purchase/import and phone-to-agent assignment are completed in the
customer's ElevenLabs/Twilio dashboards. ALMA provides the guided setup and
verifies the resulting calls through signed post-call events. Do not claim
automatic number purchasing until a separately reviewed Twilio provisioning
flow exists.

## Security and operations

- Only signed ElevenLabs events are processed.
- Duplicate provider events are ignored.
- Unrecognized agents fail closed.
- Provider keys remain server-only and encrypted.
- Browser sessions require authentication and a voice entitlement.
- Raw provider metadata is minimized.
- Recording availability is tracked, but ALMA does not automatically download
  or expose recordings.
- The customer is responsible for lawful consent and disclosure.

## Required production configuration

The existing server runtime must have:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_ENCRYPTION_KEY`

Each workspace supplies its own ElevenLabs API key and webhook secret through
the authenticated connection form. Those customer secrets are not global
environment variables.

## Launch verification

Run one non-production provider test:

1. Connect a restricted test key.
2. Create one test agent.
3. Start and end a browser session.
4. Configure the signed post-call webhook.
5. Make one Twilio test call.
6. Confirm exactly one webhook ledger record and call record.
7. Confirm contact matching or lead creation.
8. Replay the same event and confirm idempotency.
9. Confirm a bad signature is rejected.
10. Confirm a user in another workspace cannot access the agent or transcript.
