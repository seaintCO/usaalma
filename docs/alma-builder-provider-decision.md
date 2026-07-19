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
