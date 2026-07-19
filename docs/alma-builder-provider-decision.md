# ALMA Builder Provider Decision

Date: 2026-07-19

## Decision

ALMA Builder will use provider contracts in the ALMA control plane and defer real Codex/source/preview/deploy execution to a future isolated worker plane. This milestone does not choose GitHub, Vercel, Codex CLI, Codex MCP, or Codex App Server as a hard dependency.

## Options Compared

### `codex exec` In A Controlled Isolated Worker

Strengths:

- Clear process boundary away from the ALMA Next.js app.
- Can run with ephemeral credentials, resource limits, and workspace cleanup.
- Fits batch job semantics and durable audit events.

Risks:

- Requires robust sandboxing, command allowlists, log redaction, quota controls, and provider callback verification.
- Must not inherit ALMA app secrets.

Best fit: likely production path after a hardened Builder Engine exists.

### Codex MCP Server Through An Orchestration Worker

Strengths:

- Better structured tool boundary than raw shell orchestration.
- Can align with provider-specific operations and auditable commands.
- Fits future multi-provider orchestration.

Risks:

- Still needs isolation, authorization, callback signing, and strict tool permissions.
- MCP server capability drift must be versioned and tested.

Best fit: strong candidate for worker orchestration once the action and provider registry is mature.

### Codex App Server

Strengths:

- Potentially higher-level integration model.
- May reduce custom orchestration if the product becomes stable and supported for this use case.

Risks:

- Experimental for ALMA Builder production dependency purposes.
- Operational, security, lifecycle, and tenant-isolation guarantees must be proven before adoption.

Best fit: research track only. Do not make it a production dependency in the Builder foundation milestone.

## Current Provider Boundary

Provider interfaces:

- `WorkspaceProvider`
- `CodingAgentProvider`
- `SourceControlProvider`
- `PreviewProvider`
- `DeploymentProvider`
- `BuilderJobProvider`

All providers return typed results:

- `success`
- `blocked`
- `retryable_failure`
- `permanent_failure`

The current adapter returns `blocked` with `BUILDER_ENGINE_NOT_CONFIGURED` for every operation.

## Next Decision Point

The next milestone should design the Builder Engine worker contract: job queue, callback signing, source-control provider choice, preview host allowlist, artifact storage, and approval executors. No provider should be enabled until the worker plane passes the threat model in `docs/alma-builder-threat-model.md`.

## Engine 1 Decision Update

Engine 1 selects E2B for isolated Builder workspaces, the server-side Codex SDK
for the coding pass, and a GitHub App connector for approval-gated source
control. Vercel deployment, Codex App Server, arbitrary repository import, and
unrestricted MCP execution remain out of scope.

Live providers fail closed. Missing E2B configuration returns
`BUILDER_WORKSPACE_PROVIDER_NOT_CONFIGURED`; missing or unsafe Codex worker
configuration returns `BUILDER_CODING_PROVIDER_NOT_CONFIGURED`; missing GitHub
App configuration returns connector configuration-required state.

Required GitHub App environment names:

- `GITHUB_APP_ID`
- `GITHUB_APP_CLIENT_ID`
- `GITHUB_APP_CLIENT_SECRET`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`
- `GITHUB_APP_SLUG`
- `NEXT_PUBLIC_APP_URL`

Callback URL:

- `/api/connectors/github/callback`

Minimum intended GitHub App permissions:

- Metadata: read
- Contents: read/write

Repository creation/push remains approval-gated and blocked until the worker
artifact handoff is complete.

## Engine 1.1 Decision Update

The server-side Codex SDK path from Engine 1 is not accepted as a live production provider until it can prove that every generated source read and
write targets the remote E2B filesystem. A local worker path such as
`/home/user/app` is not sufficient because E2B validation uses the same string
inside a separate sandbox.

The current decision is fail-closed:

- Keep E2B as the intended isolated command and preview workspace.
- Keep the ALMA-owned E2B template under `infra/e2b/alma-builder/`.
- Keep GitHub source push approval-gated and blocked until generated artifacts
  are persisted.
- Do not enable live Codex coding sessions from the controller process until a
  remote E2B filesystem bridge is implemented.

Recommended implementation path:

- Add a coding provider adapter whose file operations call E2B file APIs for
  list/read/write/patch/delete.
- Seed starter files into E2B before the coding turn.
- Run all install, validation, build, and preview commands only through the E2B
  workspace provider.
- Archive generated source from E2B with exclusions, path checks, symlink escape
  checks, size limits, checksums, and safe manifests.
- Persist checkpoints only after validation succeeds.
