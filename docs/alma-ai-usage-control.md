# ALMA AI usage control

Date: 2026-07-21

## Routing audit and modes

The canonical chat processor remains `lib/alma/chat/processChatRun.ts`. Legacy routing used `auto`, `fast`, and `deep` with several direct OpenAI call sites. User-facing requests now accept only `instant`, `thinking`, or `pro`; a browser cannot submit a provider model ID. Research Pro remains server-only, disabled in both plans, and is never selected automatically.

Server model defaults are `gpt-5.6-luna` (Instant/low), `gpt-5.6-terra` (Thinking/medium), `gpt-5.6-sol` (Pro/high), and `gpt-5.5-pro` (Research Pro/high). The first three are configurable with server-only environment variables. Legacy internal model aliases resolve through those same defaults.

## Canonical limits

`lib/usage/limits.ts` is the only application limit registry. Essential has 500 Instant, 25 Thinking, 0 Pro, 0 Research Pro, 20 images, 3,600 voice seconds, 100 document pages, 0 Builder builds, 25 daily AI requests, and one concurrent provider request. Autonomous has 2,000 Instant, 200 Thinking, 25 Pro, 0 Research Pro, 100 images, 18,000 voice seconds, 1,000 document pages, 10 Builder builds, 100 daily AI requests, two concurrent provider requests, and one active Builder job.

## Reservation design

Migration `20260721001000_alma_ai_usage_control.sql` adds periods, reservations, events, and the chat/Builder reservation links. A service-role RPC takes a transaction-scoped advisory lock for the user/workspace, expires abandoned reservations, checks idempotency, authoritative billing period, daily/monthly quotas, and concurrency, then reserves before provider execution. Settlement stores server-observed units and token fields. Failure and cancellation release the reservation. Builder reservations last up to two hours and are settled or released by terminal worker transitions.

Active and trialing subscriptions may reserve. Canceled, past-due, incomplete, or absent subscriptions cannot. Stripe period timestamps are authoritative when present; a UTC calendar month is only the compatibility fallback. Prior events are retained across rollover.

Realtime voice reserves the advertised 15-minute session ceiling before issuing a client secret, then settles from server timestamps when the authenticated client closes the server-owned session record. Transcription reserves from a conservative server-derived audio-size estimate and settles from the provider-reported audio duration. Browser-supplied duration values are ignored.

RLS permits a user to read their own records and a workspace member to read records in that workspace. Browser roles cannot insert, update, delete, reserve, settle, or release usage. Prompts, document content, generated content, provider secrets, and raw provider responses are not written to usage tables.

## Protected execution surfaces

The shared boundary protects canonical and legacy chat, classification/tool routing, translation and WhatsApp translation, transcription, speech, realtime sessions, file/image/document analysis, embeddings, finance, invoicing, fitness AI, Gmail summaries, receptionist AI, Images and Creative generation/editing, Sites, Presentations, Launch Studio, and Builder queue/Gateway execution. `npm run usage:check` scans every direct OpenAI entry file and fails when a new route lacks a reservation boundary; explicitly listed internal provider helpers must remain reachable only from a protected caller.

No automated check invokes OpenAI, image, voice, realtime, E2B, Codex Builder, Stripe, or another paid provider.

## Environment

- `ALMA_INSTANT_MODEL`
- `ALMA_THINKING_MODEL`
- `ALMA_PRO_MODEL`
- `ALMA_RESEARCH_PRO_MODEL`
- `ALMA_USAGE_ENFORCEMENT_ENABLED`
