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
