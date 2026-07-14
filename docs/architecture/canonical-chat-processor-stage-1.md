# Canonical chat processor: Stage 1 branch inventory

This inventory records the behavior presently owned by
`app/api/chat/stream/route.ts`. Stage 1 added contracts only. Stage 2 moves
one pure helper, without moving or changing any execution branch.

## Boundary before post-persistence execution

The route authenticates the request, validates its JSON body and subscription,
creates a conversation when necessary, and persists the user message. The
future processor begins after that persistence boundary with the user, the
conversation id, message, selected language, and an optional progress callback.

## Post-persistence branches

| Order | Decision or branch | Current behavior | Future processor ownership |
| --- | --- | --- | --- |
| 1 | Explicit memory | Attempts deterministic extraction first; persists extracted memory. A failure to persist explicit memory returns a localized 503. | Memory extraction and strict memory persistence (Stage 5). |
| 2 | Implicit memory | Falls back to model extraction; logs and continues when this best-effort extraction fails. | Memory extraction behavior and failure policy (Stage 5). |
| 3 | Alma plan/tracking | Loads conversation Alma context, makes an Alma plan, and starts an agent execution plus plan step. Tracking remains compatibility/fail-open if the Phase 1 tables are unavailable. | Tracking lifecycle and telemetry boundary (Stages 3-5). |
| 4 | Image generation | `image_generation` and `image_followup` use image context, generate an image, update Alma context/activity, persist an image marker or error text, and terminally complete tracking. | Complete image execution branch (Stage 3). |
| 5 | Planned execution | Attempts `runPlannedExecution`; if it returns a plan, streams its human-readable result, persists it, and completes tracking. Planner errors log and fall through. | Planner/task branch (Stage 4). |
| 6 | Router classification | Calls `classifyAlmaRoute`; classification errors log and fall back to `chat`. | Router fallback normalization (Stage 2) and routing execution (Stage 4). |
| 7 | Finance analysis | Streams an initial status, calls the Responses API with the market prompt, persists success or fallback text, and terminally completes tracking. | Finance branch (Stage 4). |
| 8 | Router image generation | For `image_generate`, streams a status, invokes the image tool, persists its image marker or failure text, and terminally completes tracking. | Image branch (Stage 3). |
| 9 | Image editing request | For `image_edit`, persists and streams the request-for-upload guidance and terminally completes tracking. | Image branch (Stage 3). |
| 10 | Context assembly | Loads memory, integration, document, and workspace context; selects an agent and constructs the selected-language system prompt. | Normal chat setup (Stage 5). |
| 11 | Tool-assisted Responses chat | Performs a non-streaming Responses request, executes function calls, records best-effort tool steps, streams a second Responses request, persists the final assistant message, and completes tracking. | Tool execution and steps (Stage 4). |
| 12 | Normal text stream | Starts a Responses stream, emits text deltas, persists the full assistant reply, and terminally completes tracking. | Normal streaming and final persistence (Stage 5). |
| 13 | Stream failures | The tool and normal stream branches emit a user-facing error and mark tracking failed; image branches persist an error response before completion. | Error result construction and terminal tracking (Stages 3-5). |

## Route-only behavior after extraction

The compatibility route will remain responsible for request authentication,
body/subscription validation, demo mode, conversation resolution, user-message
persistence, and translating progress events to the existing plain-text stream
protocol (including `[CONVERSATION_ID:<id>]`). It will not retain duplicate
execution branches.

## Shared contracts

`lib/alma/chat/processChatRun.ts` defines the processor input, progress events,
tracking context, response route/type discriminants, and terminal success or
failure results. The optional `onProgress` callback is intentionally transport
independent: the current route can translate it into stream bytes, while a
future durable worker can omit it and persist/return the terminal result.

An idempotency key is part of the input contract now, but durable enforcement
cannot be implemented until the explicitly deferred queue schema gives it a
database uniqueness boundary.

## Stage 2 helper boundary

`lib/alma/chat/chatExecutionHelpers.ts` now owns
`buildResponseLanguageInstruction`. It is the previous route language-policy
function moved verbatim in behavior: explicit `en` and `es` selections remain
authoritative, and automatic mode retains the existing message-text fallback.
It is safe to centralize because it is deterministic and does not authenticate,
persist, stream, call a provider, or mutate execution state.

At the end of Stage 2, the route retained all image, planner, router, finance,
tool, model, memory, persistence, and error branches because moving any subset
would split an execution branch between the route and the canonical processor.
Plain-text stream formatting, including the conversation-id marker, remains
route-specific to preserve the current frontend protocol.

## Stage 3 image execution boundary

`processImageChatRun` in `lib/alma/chat/processChatRun.ts` now owns every
image result branch: planned initial generation, planned follow-up generation,
router image generation, and router image-edit guidance. It also owns image
prompt/follow-up construction, aspect-ratio selection, image context/activity
updates, assistant-message persistence, terminal execution completion, and
image failure handling. Its optional progress callback emits `status`,
`image`, and `text_delta` events for the route, while no callback is required
for a durable caller.

`startChatRunTracking` and `completeChatRunTracking` now live beside the
processor. The route still calls them for non-image branches; planned image
generation starts and completes its tracking entirely in the processor.

At the end of Stage 3, the route retained only `createImageStreamResponse`,
which emitted the unchanged conversation marker and converted processor
progress events into existing plaintext bytes. It had no image provider,
prompt, size, persistence, context, activity-log, edit-response, or
execution-completion logic.

## Stage 4 planner and tool execution boundary

`processPlannerAndToolChatRun` now owns the universal Alma context/plan
evaluation, simple planner execution, router classification and fail-open
fallback, finance responses, router image handoff, Responses API tool
discovery, tool invocation, execution-step recording, tool-response streaming,
assistant persistence, and terminal tracking. It delegates image execution to
the Stage 3 processor rather than recreating it.

The processor emits the existing transport-neutral progress events and can run
without a callback. Within one invocation, it de-duplicates tool calls by call
id before any tool side effect occurs. Its existing idempotency key input is
reserved for the later durable-run database boundary.

The route now only authenticates and validates, resolves/persists the
conversation and user message, preserves the compatibility memory write, emits
the legacy plaintext conversation marker, translates processor events, and
performs the still-deferred normal freeform model stream. No planner, router,
finance, image, or tool-assisted branch remains in the route.
