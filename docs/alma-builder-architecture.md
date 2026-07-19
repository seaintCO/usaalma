# ALMA Builder Architecture

Date: 2026-07-19

ALMA Builder is an ALMA module, not a second application platform. The checked-in app is the control plane for project intent, ownership, approvals, events, checkpoints, and future provider handoff.

## Implemented Now

- Canonical module registration: `builder` opens at `/builder`, is visible through Apps/Marketplace, and uses the canonical entitlement service.
- Tenant resolution: Builder APIs resolve user/workspace context through `resolveTenantWorkspace`.
- Data model: `builder_projects`, `builder_sessions`, `builder_events`, `builder_checkpoints`, `builder_artifacts`, and `builder_jobs`.
- Provider boundary: typed provider interfaces for workspace provisioning, coding agent sessions, source control, previews, deployments, and jobs.
- Unavailable adapter: all provider calls return a typed `blocked` result with `BUILDER_ENGINE_NOT_CONFIGURED`.
- Approval boundary: protected Builder action definitions exist for repository, workspace, source push, checkpoint restore, preview publish, and deployment.
- UI: `/builder`, `/builder/new`, and `/builder/projects/[projectId]` render real database state, loading/error/empty states, and a truthful blocked state.

## Control Plane

The Next.js application stores Builder metadata and user-visible events. It does not execute generated customer code, create repositories, publish previews, or deploy applications in this milestone.

APIs authenticate the user, resolve the canonical workspace, enforce Builder entitlement, validate input, and filter every repository query by owner and workspace. Project creation supports an idempotency key so client retries do not create duplicate drafts.

## Future Worker Plane

Real autonomous builds must run outside the ALMA Next.js process in an isolated Builder Engine with:

- per-project workspaces
- resource limits
- controlled network access
- ephemeral credentials
- auditable provider commands
- workspace cleanup
- no access to ALMA application secrets
- no access to other tenants
- callback signing and replay protection

The provider contracts intentionally avoid hardwiring the system to GitHub, Vercel, Codex CLI, MCP, or any single deployment provider.

## Lifecycle

Builder project states:

- `draft`
- `provisioning`
- `ready`
- `building`
- `validating`
- `awaiting_approval`
- `preview_ready`
- `blocked`
- `failed`
- `archived`

The domain service rejects invalid transitions. In this milestone, starting a session records `session_requested`, creates a blocked session, moves the project to `blocked`, and appends `provider_blocked`.

## Events

Builder events are append-only and store only safe summaries plus provider correlation metadata. They must never contain access tokens, raw environment variables, authorization headers, entire command output, or customer secrets.

Supported event types:

- `project_created`
- `project_updated`
- `session_requested`
- `provisioning_started`
- `provider_blocked`
- `build_started`
- `command_started`
- `command_completed`
- `validation_started`
- `validation_completed`
- `checkpoint_created`
- `approval_requested`
- `preview_ready`
- `build_failed`
- `project_archived`

## Preview Rules

Builder only renders real preview URLs that pass protocol and host validation. HTTPS is required except local development hosts. The iframe uses a restrictive sandbox and does not imply build success when no provider exists.

## Migration

Apply `supabase/migrations/20260718008000_alma_builder_foundation.sql` before using Builder in a remote environment. It is additive and creates Builder tables, indexes, ownership triggers, and RLS policies.

## Engine 1 Addendum

Engine 1 adds a trusted worker entrypoint under `workers/builder/`. The Next.js
control plane creates durable jobs, returns job/session identifiers, streams
persisted events, creates Approval Center requests, and renders allowlisted
previews. It does not run Codex, npm, generated applications, or arbitrary shell
commands in request handlers.

The worker claims one job at a time through the service-role-only
`alma_claim_builder_job` function, leases it, provisions an E2B sandbox, runs the
allowlisted build workflow, validates the generated app, starts the preview
server, verifies the preview URL, and records redacted events.

Engine providers are disabled unless `ALMA_BUILDER_ENGINE_ENABLED=true`. The
Codex provider also requires `ALMA_BUILDER_CODEX_WORKER_ISOLATED=true` so it
cannot accidentally operate against the ALMA repository instead of an isolated
workspace.

GitHub source control uses a GitHub App connector. The connection start route
creates signed state and sends the user to the GitHub App installation flow. The
callback stores safe installation metadata in `provider_connections`; private
keys and client secrets remain server environment values.

Saving Builder source to GitHub creates an Approval Center request for
`builder.source.push`. The executor validates private-repository payloads,
requires a connected GitHub App, checks for duplicate completed pushes, and
fails closed until the worker artifact handoff is available.

Apply `supabase/migrations/20260718009000_alma_builder_engine_1.sql` after the
foundation migration to add worker leases, Engine 1 statuses, preview/source
metadata, the service-role job claim RPC, and the `github_app` connector
provider value.

## Engine 1.1 Runtime Wiring Audit

Engine 1.1 verified the checked-in runtime path from durable Builder job to
isolated workspace, coding pass, validation, and preview. The original Engine 1
wiring is not genuinely runnable end to end yet.

What exists:

- Durable jobs are created by the control plane and claimed by the trusted
  worker through the service-role repository.
- E2B workspace provisioning exists and returns sandbox identifiers.
- Validation and preview commands execute inside the E2B sandbox at
  `/home/user/app`.
- Preview URLs are allowlisted and health-checked before persistence.
- GitHub save remains approval-gated and blocked until generated artifacts
  exist.

What was missing:

- Package scripts for a repeatable worker and E2B template lifecycle.
- An ALMA-owned E2B template definition.
- Starter file transfer into the E2B sandbox before coding starts.
- A generated source artifact handoff with manifest, exclusions, checksums, and
  persisted checkpoint metadata.
- Cleanup-state persistence for cancelled, timed-out, or failed sandboxes.
- Proof that the Codex SDK edits the same remote E2B filesystem that validation
  and preview commands use.

Hard boundary:

- The current Codex SDK integration starts a thread with
  `workingDirectory: "/home/user/app"` from the local worker process.
- E2B validation and preview commands run in the remote sandbox at the same
  string path.
- Matching path strings are not proof of shared storage. As implemented, the
  Codex SDK edits a local worker filesystem, while E2B validates a remote
  filesystem.

Engine 1.1 therefore keeps the worker fail-closed with
`BUILDER_RUNTIME_WIRING_BLOCKED` and
`BUILDER_CODING_PROVIDER_NOT_CONFIGURED` until a remote filesystem bridge is
implemented.

Remote filesystem bridge requirements:

- Starter templates must be copied into the E2B sandbox before the coding pass.
- Every coding-provider file read, write, list, patch, and delete must target
  E2B file APIs or a provider that natively operates inside the E2B workspace.
- Generated commands must run only through the E2B workspace command allowlist.
- ALMA controller secrets must not be visible to generated commands or generated
  source.
- Artifact export must reject absolute paths, `..`, symlink escapes, `.env*`,
  `.git`, `node_modules`, build outputs, caches, and oversized files.
- Artifact export must persist a manifest with relative paths, sizes, and
  SHA-256 checksums before source push or checkpoint restore can execute.

Template location:

- `infra/e2b/alma-builder/`
- Local smoke: `npm run builder:e2b:template:smoke`
- Cloud build: `npm run builder:e2b:template:build`

## Engine 1.2 Secure Same-Workspace Runtime

Engine 1.2 replaces the controller-side Codex SDK execution path with Codex CLI
running inside the E2B sandbox.

Runtime topology:

1. The trusted Builder worker claims a durable `builder_jobs` row.
2. The worker provisions an E2B sandbox from the ALMA-owned template.
3. The worker copies the selected ALMA-owned starter into
   `/workspace/project` through E2B file APIs and records a starter manifest
   checksum.
4. The worker issues a short-lived Builder Gateway token bound to the job,
   user, workspace, project, session, sandbox, audience, issuer, and model.
5. The worker writes a project-local Codex config and token helper into
   permission-restricted temporary paths inside E2B.
6. `codex exec --json` runs inside E2B with `--cd /workspace/project`,
   workspace-write sandboxing, no MCP servers, ignored user config/rules, and a
   custom Responses provider pointed at the ALMA Builder Gateway.
7. Validation commands run in the same sandbox and same project directory.
8. One bounded repair turn is allowed if validation fails.
9. The worker extracts a sanitized source archive from `/workspace/project`
   through E2B file APIs, verifies manifest/checksums, uploads it to the private
   `alma-builder-artifacts` bucket with trusted worker credentials, and creates
   Builder checkpoint/artifact rows.
10. Preview starts only after production build succeeds, from the same sandbox
    and project directory.

Trusted boundary:

- Permanent OpenAI, E2B, Supabase, GitHub, Stripe, OAuth, and encryption
  secrets remain in the trusted worker or gateway environments.
- The E2B sandbox receives only a short-lived Builder Gateway token. The token
  is not usable directly against OpenAI and is deleted after the Codex run.
- The Builder Gateway exposes only `POST /v1/responses`, verifies the token, and
  forwards allowed model requests to OpenAI with the permanent OpenAI key.

Commands:

- Worker loop: `npm run builder:worker`
- Single job: `npm run builder:worker:once`
- Gateway: `npm run builder:gateway`
- Gateway static/fake-provider check: `npm run builder:gateway:check`

Required migration:

- `supabase/migrations/20260718010000_alma_builder_secure_runtime.sql`

Remaining production limitations:

- Local validation does not make paid E2B, Codex, OpenAI, GitHub, or Supabase
  storage calls.
- Provider-level E2B egress restrictions must be verified in a live development
  E2B template before production enablement.
- Preview cleanup after expiration still needs a scheduled maintenance worker.
- GitHub repository writes remain blocked until a later approved source writer
  milestone; approvals now verify checkpoint ownership first.
