# ALMA Implementation Plan

This plan starts after the current audit at commit `cb31d90`.

## Current Baseline

Verified on 2026-07-18:

- `npm run check:encoding`: pass.
- `npx tsc --noEmit`: pass.
- `npm run lint`: pass with 234 warnings.
- `npm run build`: pass.

Baseline blockers:

- No build blocker.
- No TypeScript blocker.
- Lint warnings are significant but non-blocking.
- Existing encoding checker misses some mojibake strings.
- Approval center is not product-complete.
- Shared tenant/workspace model is not the canonical data boundary yet.

## Milestone 0: Audit And Baseline

Status: completed at `080d1de`.

Deliverables:

- `docs/alma-current-audit.md`
- `docs/alma-target-architecture.md`
- `docs/alma-implementation-plan.md`
- Baseline validation recorded.

Exit criteria:

- Documentation committed locally.
- No app code changed.
- Working tree clean after commit.

## Milestone 1: Shared Platform Foundation

Status: completed in this milestone.

Goal: establish one shared platform layer for tenant/workspace resolution,
module entitlement reads, module metadata, approvals, and audited execution
boundaries without redesigning the frontend shell.

Completed work:

- Added canonical module registry at `lib/platform/modules/registry.ts`.
  - Formalized Free/Core, Office, Creator, Studio, Trader, and Fitness groups.
  - Preserved existing route strings through `WORKSPACE_ROUTES`.
  - Preserved legacy install aliases such as `image_generator`.
  - Added module capability, release, risk, and approval-policy metadata.
- Added canonical entitlement service at `lib/platform/entitlements/service.ts`.
  - Existing `subscriptions` rows remain the paid-plan compatibility source.
  - Free/Core modules are represented explicitly.
  - Marketplace and module install now read access through the same service.
  - `lib/modules/plans.ts` remains as a compatibility wrapper over the registry.
- Added canonical tenant/workspace resolver at
  `lib/platform/workspace/tenantResolver.ts`.
  - Existing users resolve to a personal tenant without needing a workspace row.
  - Workspace resolution validates owner or member access.
- Added shared approval domain types and services:
  - `proposed`
  - `awaiting_approval`
  - `approved`
  - `rejected`
  - `executing`
  - `completed`
  - `failed`
- Added additive migration
  `supabase/migrations/20260718001000_alma_shared_platform_foundation.sql`.
  - Creates/hardens `workspaces`, `workspace_members`, and `workspace_invites`.
  - Adds `action_approvals` and `action_audit_logs`.
  - Adds RLS policies and workspace ownership trigger checks.
- Added audited action boundary at
  `lib/platform/actions/executionBoundary.ts`.
  - External or protected actions create approval records before execution.
  - `send_gmail` now pauses behind the shared approval boundary.
- Added focused static verification script:
  `scripts/check-shared-platform-foundation.mjs`.

Compatibility notes:

- Existing CRM, invoicing, memory, agent, subscription, Marketplace, and module
  install records are preserved.
- Existing agent-specific `agent_approvals` remain untouched for Agent Builder
  compatibility.
- The frontend shell, durable chat transport, OAuth provider architecture, and
  product workspace UIs are not redesigned in this milestone.
- Module install persists canonical install keys, so `images` still installs as
  `image_generator`.

Remaining blockers:

- Existing agent approval UI still reads `agent_approvals`; a later milestone
  should add a shared approval center that can display both agent and platform
  approvals.
- External execution approval resume endpoints are not implemented yet; the
  foundation prevents bypass and records approvals, but does not add provider
  execution UX.
- Existing database instances may already have workspace tables outside tracked
  migrations; the new migration is defensive and additive but must still be
  reviewed before application.

## Milestone 2: Assistant-First Shell And Unified Approval Center

Status: completed in this milestone.

Goal: make ALMA assistant-first without removing existing product workspaces or
changing durable chat, OAuth, subscription, CRM, invoicing, memory, or agent
ownership boundaries.

Completed work:

- Reworked shared shell navigation around the target model:
  - Desktop primary: Home, ALMA, Approvals, Files, Apps.
  - Desktop secondary: Connections, Billing, Settings.
  - Mobile bottom navigation: Home, ALMA, Approvals, Apps, Profile.
- Added route constants for `/approvals`, `/files`, `/dashboard/apps`, and
  `/connections`.
- Replaced the module-first Home with an assistant-first operating surface:
  command interface, entitlement-aware contextual shortcuts, real pending
  approval counts, real recent activity, and real blocked/failed-run alerts.
- Rebuilt Apps as a canonical module launcher backed by Marketplace and the
  module registry groups: Free/Core, Office, Creator, Studio, Trader, Fitness.
- Added Files as a unified entry point over the existing Documents repository.
  No fake file records, public URLs, or storage architecture changes were added.
- Added Connections as a shell surface over existing Marketplace connection
  state and OAuth start/disconnect routes.
- Added Unified Approval Center:
  - reads platform `action_approvals`
  - adapts existing `agent_approvals`
  - supports approve/reject
  - allows edited Gmail send payloads only through the allowlisted executor
  - shows action audit history where available
- Added safe execution resume through
  `lib/platform/actions/actionExecutorRegistry.ts` and
  `executeApprovedAction`.
  External actions cannot execute unless they pass the shared approval boundary
  and allowlisted payload validation.
- Added focused static verification:
  `scripts/check-assistant-shell-approval-center.mjs`.
- Repaired user-visible mojibake encountered in touched shell/dashboard files.

Compatibility notes:

- Existing module routes remain available.
- `app/dashboard/page.tsx` still owns dashboard chat state, durable run polling,
  conversation selection, URL prompt handling, and mobile drawer state.
- `AlmaShell` remains canonical for workspace pages.
- Existing Marketplace, Billing, Settings, CRM, Invoicing, Trader, Fitness,
  Documents, Images, and Agent Builder backends are preserved.
- Existing `agent_approvals` are not migrated or rewritten; they are displayed
  through an adapter in the unified approval service.
- OAuth providers are not expanded.
- No migration was added in this milestone.

Remaining blockers:

- The Approval Center can execute only explicitly allowlisted actions. Gmail
  send is the first allowlisted executor; other protected external actions must
  be added deliberately.
- Browser verification requires a locally authenticated session to verify real
  user data and approval execution end to end.
- The existing lint baseline still contains broad warnings outside this
  milestone; no blanket cleanup was performed.

## Milestone 2.2: Runtime Integration Repair

Status: completed in this milestone.

Goal: repair the assistant-first shell runtime data layer so empty states,
authentication failures, unavailable storage/schema, optional provider
configuration, and real network/server failures are not collapsed into generic
Retry states.

Completed work:

- Split assistant-shell surfaces into explicit runtime states:
  - Apps and Marketplace distinguish unauthenticated users from catalog
    failures.
  - Connections distinguishes unauthenticated users, not connected providers,
    connected providers, reconnect-required providers, coming soon providers,
    setup-required providers, and configuration-unavailable provider storage.
  - Files distinguishes unauthenticated users, empty document lists, unavailable
    storage/document reads, and real retryable failures.
  - Approvals distinguishes unauthenticated users, empty approval views,
    missing/unavailable approval schema, and retryable failures.
  - Billing distinguishes unauthenticated users, no subscription/Free plan,
    active subscription, optional plan/history read gaps, and failed billing
    status reads.
- Made Home require only the dashboard summary read. Marketplace shortcuts and
  approval counts now degrade to empty sections if their optional reads fail.
- Fixed the dashboard auth gate so unauthorized onboarding or billing-required
  checks redirect to Login instead of incorrectly redirecting to Billing.
- Preserved canonical module registry and entitlement reads. Marketplace catalog
  now tolerates optional module-install, OAuth connection, and voice-provider
  read failures while reporting configuration warnings.
- Changed the documents list API to return structured success/error payloads and
  updated Documents to accept both the structured payload and the legacy array
  shape.
- Repaired user-visible mojibake encountered in touched Billing and Documents
  source.

Migration findings:

- `supabase/migrations/20260718001000_alma_shared_platform_foundation.sql` is
  still required for platform `action_approvals`, `action_audit_logs`, and
  persisted workspace membership flows.
- The migration is additive/defensive overall: it creates missing workspace,
  membership, invite, action approval, and audit tables; adds missing workspace
  columns; creates indexes; enables RLS; and recreates scoped policies/triggers.
- The migration depends on existing `public.agents`,
  `public.agent_executions`, and `public.alma_set_updated_at()`. If any are
  missing in a target database, SQL Editor execution will fail before those
  dependencies are added.
- The locally configured Supabase URL is a placeholder, so the actual project
  ref and development/production classification could not be verified from this
  checkout.

Compatibility notes:

- No remote migration was applied.
- No OAuth provider architecture, durable chat transport, subscription schema,
  Marketplace registry, storage bucket, or frontend shell redesign was changed.
- Empty results are now rendered as empty states. Retry buttons remain only on
  retryable failures and repeat the same load request.

Remaining blockers:

- Authenticated browser verification requires a real local Supabase URL/key and
  a signed-in development account.
- Approval Center persistence cannot fully work until the shared platform
  foundation migration is applied to the target database.
- Real provider connection states depend on existing OAuth/voice configuration
  tables and provider credentials.

## Milestone 3: Alma Office Core

Status: completed in this milestone.

Goal: create the operational foundation for the Office loop:
Ask Alma -> prepare work -> owner reviews -> owner approves -> Alma executes.

Completed work:

- Added additive Office schema migration:
  - `office_profiles`
  - `office_services`
  - `office_projects`
  - `office_estimates`
  - `office_estimate_line_items`
  - `office_estimate_attachments`
  - `office_estimate_status_history`
- Reused existing CRM `contacts` and `companies` as customer records.
- Reused existing `invoices` and `invoice_line_items` for estimate conversion.
- Added deterministic estimate calculation helpers for subtotal, discounts,
  taxes, total, deposit, and remaining balance.
- Added Alma Office repository and API routes for overview, customers,
  services, estimates, delivery approval preparation, and invoice conversion.
- Added `/office` workspace reachable from Apps through the canonical module
  registry.
- Added controlled Office tools to the canonical tool registry:
  - find customer
  - create customer draft
  - find services
  - draft/revise estimate
  - attach project photos
  - analyze project photos into preliminary scope
  - prepare estimate delivery
  - convert accepted estimate to invoice
  - prepare deposit request
  - schedule estimate follow-up
- Registered `office.estimate.deliver` with the audited action executor.
  Estimate delivery cannot mark an estimate sent unless the real executor
  succeeds.
- Added contextual Home shortcuts for estimate/customer/approval/invoice work.
- Added `scripts/check-alma-office-core.mjs`.

Compatibility notes:

- No QuickBooks, WhatsApp, or new OAuth provider was added.
- AI tools cannot invent prices; estimate tools require explicit line rates
  supplied from saved services or owner-provided input.
- Project photo analysis is preliminary only and explicitly avoids claiming
  exact image measurements without confirmed scale/dimensions.
- Payment/deposit requests remain blocked unless a real provider is connected.

Remaining blockers:

- The new Office migration must be applied to the target Supabase project before
  `/office` can load persisted Office records there.
- Real estimate delivery depends on a connected email provider. Without Gmail,
  the approval executor fails safely and does not mark estimates as sent.
- Payment-link generation is deferred until a real payment provider is connected
  and approved.

## Milestone 4: Production Connector Center And Approval-Controlled Email

Status: completed in this milestone.

Goal: give Alma workspaces a one-click connector foundation and route Office
estimate delivery through owner approval and real Gmail/Outlook sends.

Runtime verification:

- The owner confirmed the shared platform and Office migrations were applied.
- A read-only Supabase REST probe confirmed `office_profiles`,
  `office_services`, `office_estimates`, `office_estimate_line_items`, and
  `office_estimate_status_history` are reachable.
- `oauth_connections` denied anon access, which is the desired posture for the
  legacy token-bearing OAuth table.
- `action_approvals` returned `42P17 infinite recursion detected in policy for
relation "workspaces"` under anon/RLS probing. Milestone 4 adds an additive
  policy repair with security-definer workspace access helpers.
- Authenticated Office CRUD could not be truthfully exercised in this shell
  because no signed-in browser session or test credentials were available.

Completed work:

- Added additive connector migration `20260718004000_alma_secure_connectors.sql`.
- Added safe connector metadata table `provider_connections`.
- Added server-only encrypted token table `provider_connection_secrets`.
- Added `email_delivery_records` for duplicate-send prevention and provider
  result storage.
- Added `office_estimate_follow_ups` for follow-up intent storage.
- Added Office estimate delivery metadata columns for provider, connection,
  provider message ID, and delivery timestamp.
- Added signed OAuth state, PKCE verifier storage, workspace binding, and
  return-path allowlisting.
- Added Gmail OAuth, identity lookup, refresh, revoke helper, and Gmail send
  adapter using the minimum send scope.
- Added Outlook OAuth, identity lookup, refresh, and Microsoft Graph send
  adapter using delegated `Mail.Send`.
- Rebuilt `/connections` as a focused Connection Center for Gmail and Outlook.
- Routed Office estimate delivery through the connector email abstraction and
  approval executor. Estimates remain unsent unless the provider send succeeds.

Compatibility notes:

- Legacy Google Workspace and Stripe OAuth code remains in place for Marketplace
  and existing Agent Builder compatibility.
- New Office delivery uses `provider_connections` and
  `provider_connection_secrets`, not legacy `oauth_connections`.
- QuickBooks, Stripe Connect, and WhatsApp Business are represented in the
  connector schema for future work but are not operational.

Remaining blockers:

- Apply `20260718004000_alma_secure_connectors.sql` to the target Supabase
  project before production connector persistence.
- Configure `SUPABASE_SERVICE_ROLE_KEY`; the inspected local `.env.local` did
  not include it.
- Configure Google and Microsoft OAuth credentials and callback URLs documented
  in `docs/alma-connector-setup.md`.
- Real end-to-end OAuth and send verification requires provider authorization.

## Milestone 5: Bilingual Communications, Voice, Translator, And WhatsApp

Status: in progress.

### Phase 1: Shared Bilingual Communication Domain

Status: completed in this milestone.

Completed work:

- Added shared communication language and tone registry for English and Spanish.
- Added one server-side communication operation service for language detection,
  grammar correction, translation, tone rewrite, summary, bilingual reply, and
  external-message preparation requests.
- Added business-token preservation for email addresses, URLs, phone numbers,
  invoice/project/job references, dates, currency, measurements, addresses, and
  quoted text before provider translation.
- Added OpenAI-backed translation through the existing fast model path, with a
  clearly marked local fallback when the provider is unconfigured or fails.
- Added additive migration
  `20260718005000_alma_bilingual_communications.sql` for workspace language
  preferences, workspace glossary terms, and translation job audit records.
- Added `components/communications/BilingualComposer.tsx` for original,
  corrected, translated, preview, warning, copy, listen, and use-version flows.
- Integrated the composer into ALMA message drafting, Approval Center editable
  email/Office approvals, and the Office estimate workspace delivery-prep area.
- Registered `communications` and `translator` through the canonical module
  registry and route registry. The Translator route is implemented in the next
  phase.
- Added `scripts/check-alma-bilingual-communications.mjs`.

Compatibility notes:

- External sends still use the Approval Center and allowlisted action
  executors.
- The translation API authenticates users and checks module access through the
  canonical entitlement service.
- Translation job persistence degrades if the migration is not present; user
  translation responses still return an honest provider/fallback state.
- No provider secrets are referenced by client components.

Remaining blockers:

- Apply the bilingual communications migration to Supabase before expecting
  persisted glossary and translation audit history.
- Real provider translation requires `OPENAI_API_KEY`; otherwise ALMA returns a
  review-required local fallback.

### Phase 2: Translator, Realtime Voice, And Safe Memory Foundation

Status: completed in this milestone.

Completed work:

- Added `/translator` and registered it through the canonical Apps/module
  registry. It supports text translation, push-to-talk transcription, and a
  two-sided English/Spanish conversation mode.
- Added server-only Realtime session bootstrap at `/api/realtime/session`.
  It authenticates the user, resolves workspace ownership, checks voice
  entitlements, rate-limits session creation, and requests a short-lived
  OpenAI Realtime client secret without exposing the permanent API key.
- Added `/api/translator/transcribe` using the configured OpenAI transcription
  model and the shared communication translation service.
- Added `/api/translator/speech` using the configured OpenAI speech model with
  browser speech synthesis as a local playback fallback.
- Added `components/voice/AlmaVoiceControls.tsx` to the ALMA chat composer with
  start, mute, end, status, and disclosure states. The browser surface creates
  no provider sessions unless the server bootstrap succeeds.
- Added additive migration
  `20260718006000_alma_realtime_voice_memory.sql` for voice preferences,
  voice session metadata, transcripts, and proposed conversation memories.
- Added `/api/memory` and a Settings memory surface showing proposed memories.
  Raw audio is not stored by default.
- Added `scripts/check-alma-realtime-voice.mjs`.

Compatibility notes:

- Voice does not create a second ALMA brain. It uses the existing ALMA chat
  surface and keeps external/state-changing actions behind the shared approval
  boundary.
- Realtime, transcription, and speech model names are environment-configurable
  and validated against supported allowlists.
- Missing OpenAI configuration returns honest blocked states. No fake realtime
  connection or fake provider audio is reported as successful.

Remaining blockers:

- Apply the realtime voice memory migration before persisted voice/session
  memory records are available in Supabase.
- Browser WebRTC end-to-end audio requires a valid authenticated session,
  microphone permission, and configured OpenAI Realtime access.

### Phase 3: Secure WhatsApp Business Connector And Communications Inbox

Status: completed in this milestone.

Completed work:

- Made `whatsapp_business` an operational provider in the existing connector
  registry when Meta server configuration is present.
- Added Meta Embedded Signup start/callback routes under
  `/api/connectors/whatsapp/*`. Customers connect their own WABA/phone number;
  ALMA does not provide one shared sending number.
- Stored WhatsApp access tokens through the existing encrypted
  `provider_connection_secrets` system. Tokens are never returned to the
  browser.
- Added webhook GET challenge verification and POST signature verification
  using `x-hub-signature-256` and constant-time comparison.
- Added idempotent inbound webhook normalization for text, image captions,
  documents, audio metadata, and provider statuses.
- Added additive migration
  `20260718007000_alma_secure_whatsapp_communications.sql` for communication
  threads, messages, drafts, WhatsApp templates, opt-in state, delivery
  records, and webhook events.
- Added `/communications`, a minimal unified inbox for WhatsApp/email/future
  channels with translated previews, unread/delivery state, and bilingual reply
  drafting.
- Added `whatsapp.message.send` approval creation and allowlisted execution.
  Approved sends use duplicate-send prevention through
  `whatsapp_delivery_records` and are marked accepted only after Meta accepts
  the API request.
- Added service-window/template-required enforcement. Free-form WhatsApp sends
  are blocked outside the customer service window unless a template name is
  provided.
- Added `scripts/check-alma-whatsapp.mjs`.

Policy boundary:

- WhatsApp is implemented only for business-specific communication: customer
  support, estimates, invoices, project updates, scheduling, reminders, and
  operational messages. It is not a general-purpose ALMA assistant distribution
  channel.

Compatibility notes:

- Gmail/Outlook connector routes remain unchanged.
- WhatsApp disconnect uses a server-only route that deletes encrypted secrets
  and marks connection metadata disconnected.
- Outbound WhatsApp, like outbound email, must pass through the shared Approval
  Center before execution.

Remaining blockers:

- Apply the WhatsApp communications migration before persisted inbox records,
  webhook idempotency, templates, opt-ins, and delivery records are available.
- Configure Meta app credentials, Embedded Signup configuration, production
  callback URL, webhook URL, webhook verify token, and app review/business
  verification before live WhatsApp use.
- Provider media download/transcription for WhatsApp voice notes is normalized
  and storage-ready, but real media fetching requires live Meta credentials and
  should be verified after webhook configuration.

### Phase 4: Translation And Audio Runtime Repair

Status: completed in this milestone.

Completed work:

- Removed the local dictionary translation fallback from the shared bilingual
  communication service. ALMA no longer reports fake or partial dictionary
  output as a successful translation.
- Added provider-output validation for bilingual translation:
  - retries once when source-language contamination is detected
  - rejects mixed-language output such as English words left in Spanish output
  - preserves protected amounts, dates, project IDs, URLs, emails, and
    construction measurements
  - returns structured failures when OpenAI is unconfigured or unavailable
- Kept the response shape compatible while adding explicit `original`,
  `corrected`, `translated`, `sourceLanguage`, and `targetLanguage` fields.
- Centralized voice runtime configuration in `lib/voice/config.ts`.
  Transcription, speech, and Realtime routes now read `OPENAI_API_KEY` at
  request time and validate configured model names with precise error codes.
- Hardened `/api/translator/transcribe`:
  - accepts browser MediaRecorder formats such as `audio/webm`, `audio/ogg`,
    and `audio/mp4`
  - validates MIME type and size before provider calls
  - maps authorization, usage limit, unsupported media, provider, and config
    failures to structured statuses
- Hardened `/api/translator/speech` with text length, voice/model validation,
  provider error mapping, and no-store generated audio responses.
- Updated Translator and Bilingual Composer UI states so provider/config
  failures are visible and generated audio object URLs are revoked after
  playback.
- Added deterministic verification in
  `scripts/check-alma-translation-runtime.mjs` without live OpenAI calls.

Compatibility notes:

- Existing communication job persistence is preserved for successful provider
  translations only.
- Browser speech synthesis is no longer used to hide failed provider speech in
  the translator surfaces.
- `.env.local` already lists the required model variables, but a running
  Next.js server must be restarted after editing environment values.

Remaining blockers:

- Live audio verification still requires a signed-in browser session,
  microphone permission, and valid OpenAI access for the configured models.

### Phase 5: Browser Audio Format Compatibility

Status: completed in this milestone.

Completed work:

- Repaired browser MediaRecorder uploads for Microsoft Edge/Chromium by
  normalizing MIME types before server validation:
  - lowercases and trims values
  - removes codec parameters such as `;codecs=opus`
  - maps `video/webm` recorder output into the OpenAI-supported WebM container
- Added a canonical upload-format helper at `lib/voice/audioUpload.ts`.
  Supported server containers are limited to OpenAI transcription formats:
  `webm`, `mp4`, `mp3/mpeg`, `wav`, and `m4a`.
- Removed the unsupported OGG acceptance path unless a future milestone adds
  real transcoding.
- The transcribe route now ignores browser filenames, creates a sanitized
  `recording.*` `File`, preserves the 25 MB limit, and returns structured 415
  responses with only the normalized MIME and supported container list.
- Updated `/translator` recording setup to prefer:
  - `audio/webm;codecs=opus`
  - `audio/webm`
  - `audio/mp4;codecs=mp4a.40.2`
  - `audio/mp4`
- Added microphone cleanup on recording stop, failure, tab visibility changes,
  and component unmount.
- Expanded deterministic verification so codec-parameter regressions cannot
  pass without live OpenAI calls.

Compatibility notes:

- Push to Talk and Conversation mode still send real provider-backed
  transcription requests only after authentication and upload validation.
- Unsupported browsers now get a clear client state instead of uploading an
  arbitrary default recording container.

### Phase 6: Realtime Conversational Translation

Status: completed in this milestone.

Completed work:

- Split Translator into two intentionally different speech experiences:
  - Push to Talk remains Standard translation using the existing single-turn
    upload, transcription, translation, and speech path.
  - Conversation now uses persistent WebRTC translation sessions instead of
    replaying the batch path.
- Added dedicated authenticated route
  `app/api/realtime/translation-session/route.ts`.
  - Authenticates ALMA users.
  - Resolves workspace ownership.
  - Enforces voice entitlements.
  - Allows only English and Spanish directions.
  - Uses `ALMA_REALTIME_TRANSLATION_MODEL`.
  - Requests short-lived OpenAI Realtime Translation client secrets.
  - Adds a privacy-safe hashed safety identifier.
  - Rate-limits session creation.
  - Records safe session metadata through existing `voice_sessions` when
    available.
- Added `lib/voice/realtimeTranslation.ts` for canonical English -> Spanish and
  Spanish -> English direction mapping.
- Added reusable realtime client hook
  `components/translator/useRealtimeTranslationConversation.ts`.
  - Creates one WebRTC translation session per direction.
  - Uses separate microphone tracks per direction.
  - Enables only the active speaker direction.
  - Streams source transcript deltas and translated transcript deltas.
  - Plays translated remote audio directly from WebRTC.
  - Tracks setup, first transcript, first translated transcript, first audio,
    end-of-utterance, and reconnect metrics.
  - Closes media tracks, peer connections, data channels, audio elements, and
    timers on end, page hide, mode change, and unmount.
- Added `components/translator/RealtimeConversationInterpreter.tsx` with
  speaker-specific controls, session timer, connection state, history, pause,
  mute, replay, side swap, transcript delete, and honest fallback to Standard
  Push to Talk.
- Added deterministic verification in
  `scripts/check-alma-realtime-conversation.mjs`.

Compatibility notes:

- Existing batch transcription, translation, and speech APIs remain available
  and continue to back Standard Push to Talk.
- Conversation never silently reports realtime success if realtime setup fails;
  it shows "Live interpretation is unavailable. Use Standard Push to Talk."
- Raw audio is not stored. Transcript persistence remains governed by the
  existing workspace memory preference and current voice transcript storage
  behavior.

The older split milestones below are retained as planning history. Their shell,
Home, Apps/Files, and Approval Center portions are superseded by this completed
assistant-first milestone.

## Milestone 2: Foundational Stabilization

Goal: make the current foundation safer before visual restructuring.

Scope:

- Strengthen encoding checker to catch general `Ã`, `Â`, `â`, replacement character, and common mojibake sequences.
- Repair user-visible mojibake in orchestration/tool/workspace copy.
- Remove duplicate `image_generator` entitlement in `lib/modules/plans.ts`.
- Document demo/beta environment gates and ensure mock OAuth is not presented as production.
- Add a small platform status checklist script if useful.

Do not:

- Redesign pages.
- Change durable chat behavior.
- Apply migrations.
- Rewrite tool execution.

Validation:

- `npm run check:encoding`
- `npx tsc --noEmit`
- Targeted ESLint
- `npm run build`
- `git diff --check`

Commit:

- `fix(alma): stabilize platform foundation`

## Milestone 3: Simplified Shell Foundation

Goal: introduce the target navigation model without breaking existing routes.

Scope:

- Add typed shell navigation model for Home, Alma, Approvals, Files, Apps.
- Keep `WORKSPACE_ROUTES`.
- Keep current module routes available.
- Add placeholder-safe Approvals and Files route entries only if backed by real data/read surfaces.
- Convert mobile nav to Home, Alma, Approvals, Apps, Profile.
- Keep Marketplace accessible as Apps detail or secondary path.

Do not:

- Delete `WorkspaceNavigation`.
- Remove existing routes.
- Create a second shell.

Validation:

- Browser checks at mobile and desktop sizes.
- Existing dashboard chat conversation flow.
- Existing workspace route navigation.
- Build/type/lint/diff checks.

Commit:

- `refactor(alma): simplify primary shell navigation`

## Milestone 4: Simplified Home

Goal: make `/dashboard` assistant-first.

Scope:

- Replace visible module grid/quick-action overload with:
  - large command interface
  - up to four contextual shortcuts
  - pending approvals
  - recent activity
  - important alerts
- Reuse `/api/dashboard/summary`.
- Add approvals summary only from real approval records.
- Keep chat state and durable run polling in `app/dashboard/page.tsx`.

Do not:

- Modify durable chat transport.
- Invent alerts or fake activity.
- Show every module on first screen.

Validation:

- Mobile 390 and 430 checks.
- Desktop 1440 check.
- Empty/loading/error/success states.
- Chat still sends and resumes.

Commit:

- `refactor(alma): simplify operating home`

## Milestone 5: Apps And Files

Goal: make modules discoverable without clutter.

Scope:

- Build Apps launcher backed by Marketplace/module registry.
- Group Apps into Alma Office, Creator, Studio, Trader, Fitness, Personal Tools.
- Create Files experience over Documents first.
- Preserve private signed download behavior.
- Keep module detail states truthful.

Do not:

- Claim inactive integrations work.
- Merge storage buckets destructively.
- Add fake file records.

Validation:

- Marketplace catalog still works.
- Module install still respects entitlements.
- Documents upload/list/search/download still work.

Commit:

- `refactor(alma): add apps and files surfaces`

## Milestone 6: Approval Center V1

Goal: complete user-facing approval model before external action expansion.

Scope:

- Add `/approvals` page or equivalent shell surface.
- Read pending/completed `agent_approvals`.
- Support approve/cancel for actions that can safely remain pending.
- Add edit flow only where execution service supports edited payloads.
- Define protected action categories.
- Ensure Gmail send, payment/deposit links, destructive deletes, deploys, and financial status changes are approval-required before automatic execution.

Potential migration:

- If `agent_approvals` cannot represent non-agent approvals cleanly, add an additive `action_approvals` table or compatibility view/service. Do not modify old migrations.

Validation:

- RLS ownership tests.
- Approve/cancel state tests.
- Audit log tests.
- No raw provider errors.

Commit:

- `feat(alma): add approval center foundation`

## Milestone 7: Alma Office Data Foundation

Goal: complete Office records without duplicating CRM/Invoicing.

Scope:

- Company services and pricing records.
- Estimates linked to CRM customer/company and optional Construction project.
- Estimate line items.
- Deposit/payment link intent records.
- Follow-up scheduling through Tasks/Planner.

Migration:

- Additive migration only.
- Preserve `contacts`, `companies`, `opportunities`, `invoices`, `invoice_line_items`.

Validation:

- RLS user/workspace ownership.
- Formula tests.
- No fake payment state.

Commit:

- `feat(alma): add office estimate foundation`

## Milestone 8: Alma Office End-To-End

Goal: customer to estimate to invoice to approved follow-up.

Scope:

- Office dashboard path.
- Customer/contact selection.
- Services/pricing selection.
- Estimate generation and approval.
- Invoice creation from approved estimate.
- Deposit/payment link preparation through Stripe connection if real.
- Email draft/send through Google if real and approved.

Do not:

- Create a second invoicing system.
- Mark payments paid without Stripe confirmation.
- Send external email without approval.

Validation:

- Office happy path.
- Empty/error/retry states.
- Provider missing/reconnect states.
- Stripe entitlement and connection checks.
- Mobile and desktop checks.

Commit:

- `feat(alma): complete office workflow`

## Milestone 9: Verification And Hardening

Scope:

- Add focused integration checks for:
  - auth gate
  - subscription/entitlement gate
  - module install
  - approval ownership
  - Office estimate formulas
  - invoice ownership
  - private file signed URLs
- Reduce critical lint warnings in touched foundation files.
- Document production environment requirements.

Commit:

- `test(alma): add office platform verification`

## Deferred Until Foundation Stable

- Alma Creator expansion.
- Alma Studio expansion.
- Alma Trader expansion beyond existing TradingView-compliant workspace.
- Alma Fitness expansion.
- QuickBooks/Microsoft/WhatsApp production integration claims.
- General autonomous scheduled work beyond durable chat/job foundation.

## Completed: ALMA Builder Foundation

Commit target: `feat(alma): establish builder foundation`

Date: 2026-07-19

Implemented:

- Registered canonical `builder` module in Apps/Marketplace at `/builder` with business-plan entitlement, beta release status, protected risk, and truthful limitations.
- Added entitlement-aware Home shortcut through the existing Marketplace catalog path.
- Added additive migration `20260718008000_alma_builder_foundation.sql` for:
  - `builder_projects`
  - `builder_sessions`
  - `builder_events`
  - `builder_checkpoints`
  - `builder_artifacts`
  - `builder_jobs`
- Added RLS, indexes, timestamp triggers, idempotency keys, and ownership validation for Builder records.
- Added typed lifecycle states and transition checks.
- Added provider interfaces for workspace, coding agent, source control, preview, deployment, and jobs.
- Added unavailable provider adapter returning `BUILDER_ENGINE_NOT_CONFIGURED` without running code or fabricating progress.
- Added protected Builder action definitions for repository creation, workspace provisioning, source pushes, checkpoint restore, preview publishing, and deployment creation.
- Added authenticated Builder APIs for project list/create/read/update, session start, events, checkpoints, and archive.
- Added `/builder`, `/builder/new`, and `/builder/projects/[projectId]` surfaces with real loading, empty, blocked, error, and retry states.
- Added Builder architecture, threat model, and provider decision docs.

Compatibility notes:

- No existing CRM, invoicing, Office, approvals, connectors, chat, voice, translation, Agent Builder, Trader, Images, or durable chat behavior was intentionally changed.
- Builder reuses `resolveTenantWorkspace`, `EntitlementService`, `WORKSPACE_ROUTES`, Marketplace catalog generation, `AlmaShell`, and the existing Approval Center read path.
- No Builder executor is registered yet, so the execution boundary fails closed for protected Builder actions.

Remaining blockers:

- Remote Supabase environments must apply the additive Builder migration before runtime Builder project creation works.
- Real builds require an isolated Builder Engine worker, signed callbacks, source-control provider, preview provider, deployment provider, quota limits, log redaction, cleanup jobs, and executable approval adapters.
- Codex App Server remains experimental and is not a production dependency.

## Completed: ALMA Builder Engine 1

Commit target: `feat(alma): add isolated builder engine`

Date: 2026-07-19

Implemented:

- Added Engine 1 dependencies for E2B workspace provisioning and the server-side
  Codex SDK.
- Added additive migration `20260718009000_alma_builder_engine_1.sql` for
  Engine job statuses, leases, cancellation, heartbeat, claim indexes,
  service-role-only `alma_claim_builder_job`, Builder preview/source metadata,
  and `github_app` connector support.
- Added trusted worker entrypoint under `workers/builder/`.
- Added E2B workspace and preview providers with allowlisted commands, sandbox
  metadata, timeout, preview host validation, and redacted command output.
- Added Codex coding provider with a narrow Builder engineering prompt,
  credentials kept server-side, no network access, and an explicit isolated
  worker gate.
- Added Engine repository functions for job creation, atomic claim, heartbeat,
  cancellation, redacted events, and runtime project updates.
- Changed Builder session start to queue durable jobs instead of blocking the
  browser request on execution.
- Added starter templates, starter selection, revision requests, cancel build,
  preview expiration, and approval-gated GitHub save UI.
- Added GitHub App connector start/callback/disconnect routes using signed
  state and safe installation metadata.
- Registered guarded Builder approval executors for repository creation and
  source push.
- Added `scripts/check-alma-builder-engine-1.mjs`.

Compatibility notes:

- The Next.js control plane still never runs generated code, Codex, npm, or E2B
  commands in request handlers.
- Existing Builder foundation APIs, Approval Center, connector storage, module
  entitlements, workspace resolver, and shell remain compatible.
- Live provider execution is skipped unless environment configuration explicitly
  enables the worker providers.

Remaining blockers:

- Apply the Builder Engine 1 migration before remote Engine 1 runtime use.
- Configure E2B, Codex/OpenAI, preview-host allowlist, and GitHub App
  environment values in the target environment.
- Complete the generated source artifact handoff before GitHub push can create
  repositories or commits.
- Run live E2B/Codex/GitHub verification only with explicit approval because it
  may use paid providers or create external resources.

## Completed: ALMA Builder Engine 1.1 Runtime Wiring Verification

Commit target: `fix(alma): complete builder runtime wiring`

Date: 2026-07-19

Implemented:

- Added repeatable Builder runtime commands:
  - `npm run builder:worker`
  - `npm run builder:worker:once`
  - `npm run builder:e2b:template:build`
  - `npm run builder:e2b:template:smoke`
- Added a fail-closed worker guard at
  `scripts/builder-worker-runtime-blocked.mjs`.
  The scripts report `BUILDER_RUNTIME_WIRING_BLOCKED` until the remote
  filesystem bridge is implemented.
- Added ALMA-owned E2B template source under `infra/e2b/alma-builder/`.
  The template defines a Node 22 non-root workspace at `/home/user/app`, copies
  no ALMA app source, embeds no controller secrets, and includes a local smoke
  test.
- Hardened the Codex provider so it returns
  `BUILDER_CODING_PROVIDER_NOT_CONFIGURED` unless same-workspace remote E2B file
  access exists.
- Added sandbox cleanup after coding or validation failures when an E2B sandbox
  has already been provisioned.
- Added deterministic verification in
  `scripts/check-alma-builder-runtime-wiring.mjs`.

Runtime conclusion:

- The original Engine 1 control-plane and worker queue architecture is sound as
  a foundation, but it is not yet a truthful live build path.
- E2B command execution and preview validation operate in the remote sandbox.
- The current Codex SDK integration cannot prove that source edits target that
  same remote sandbox. It would edit a local worker filesystem path, so the live
  coding path remains blocked.

Compatibility notes:

- No database migration was added or applied.
- No ALMA shell, Apps, Marketplace, Office, Trader, Translator, durable chat, or
  connector behavior was intentionally changed.
- No external E2B, Codex, GitHub, Supabase, or deployment call is made by the
  new verification scripts.

Remaining blockers:

- Implement starter transfer into E2B.
- Implement a remote E2B filesystem bridge or replace the coding provider with
  one that natively edits inside E2B.
- Add artifact manifest/checksum persistence before GitHub source push or
  checkpoint restore can succeed.
- Persist cleanup states for stale or failed sandboxes.

## Completed: ALMA Builder Engine 1.2 Secure Sandbox Coding Runtime

Commit target: `feat(alma): add secure sandbox coding runtime`

Date: 2026-07-19

Implemented:

- Replaced controller-side Codex SDK execution with `codex exec --json` inside
  the E2B sandbox at `/workspace/project`.
- Added ALMA-owned starter templates under `builder-starters/` and a secure
  starter transfer service with path, symlink, exclusion, count, byte, and
  checksum controls.
- Added Builder Gateway token issuance and verification with signed,
  short-lived, scoped, revocable tokens persisted only by hash.
- Added trusted Gateway worker at `workers/builder/gateway/`.
  It exposes only `POST /v1/responses`, verifies Builder tokens, enforces the
  configured model and quota, and forwards to OpenAI without exposing permanent
  OpenAI credentials to E2B.
- Added private artifact handoff from E2B to the trusted worker using sanitized
  manifests, ZIP archives, SHA-256 checksums, private storage, and Builder
  checkpoint/artifact records.
- Updated the E2B template to use `/workspace/project` and install pinned
  `@openai/codex@0.144.6`.
- Added additive migration
  `20260718010000_alma_builder_secure_runtime.sql` for gateway token records,
  project runtime metadata, and the private `alma-builder-artifacts` bucket.
- Added `scripts/check-alma-builder-secure-runtime.mjs`.

Compatibility notes:

- No frontend shell redesign was performed.
- No external OAuth, repository creation, deployment, or migration application
  was performed.
- Existing Builder project/session/job/event/checkpoint/artifact tables are
  reused.
- Existing GitHub approval executor now verifies checkpoint ownership before
  remaining safely blocked.

Remaining blockers:

- Apply the secure runtime migration before live Builder 1.2 use.
- Configure Builder Gateway URL, signing key, audience, model, E2B template, and
  OpenAI key in trusted environments.
- Perform an explicitly approved live development smoke test for Codex custom
  provider compatibility and E2B network controls.
- Add scheduled cleanup for expired previews and stale sandboxes.

## Operating Rules For Every Milestone

- Inspect current implementation first.
- Report exact files before editing.
- Use additive migrations only.
- Do not apply migrations without approval.
- Do not deploy.
- Do not push.
- Run:
  - `npm run check:encoding`
  - Prettier on touched files
  - `npx tsc --noEmit`
  - targeted ESLint
  - focused checks
  - `npm run build`
  - `git diff --check`
- Create one local commit per stable milestone.
- Keep this implementation plan updated.
