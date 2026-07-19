# ALMA Builder Threat Model

Date: 2026-07-19

## Implemented Protections

- Tenant separation: every Builder table carries `user_id` and optional `workspace_id`; RLS and ownership triggers enforce owner/member access.
- No anonymous access: Builder RLS policies require `auth.uid() = user_id`.
- No in-process code execution: Builder APIs do not expose shell execution, run generated code, install dependencies, or execute customer projects inside Next.js.
- Provider fail-closed behavior: missing providers return `BUILDER_ENGINE_NOT_CONFIGURED` and persist a safe blocked event.
- Approval boundary: repository creation, workspace provisioning, source pushes, checkpoint restore, preview publish, and deployment are protected action definitions.
- Secret hygiene: provider IDs are stored as identifiers only; provider credentials must use the existing encrypted connector architecture in a later milestone.
- Preview validation: only allowlisted hosts and safe protocols are rendered; previews use restrictive iframe sandboxing.
- Event hygiene: Builder events store summaries and metadata only, not raw secrets or full command output.
- Idempotency: project creation and future job rows include idempotency keys.

## Primary Threats

- Arbitrary-code execution: generated apps can run malicious install scripts or runtime code.
- Prompt injection: user or file content may instruct a Builder agent to leak secrets, disable tests, or bypass approvals.
- Malicious dependencies: packages can exfiltrate data or run supply-chain payloads during install/build.
- Secret exfiltration: environment variables, provider tokens, and ALMA service keys must never enter Builder workspaces.
- SSRF: generated code or preview callbacks may attempt internal network access.
- Unsafe preview URLs: a malicious host can attempt credential theft, clickjacking, or browser exploitation.
- Callback spoofing: provider webhooks/events may be forged without signature checks and replay protection.
- Command injection: user prompts, filenames, or branch names can become shell arguments if not isolated and escaped.
- Log leakage: terminal output can include tokens, URLs, headers, or customer secrets.
- Abandoned workspaces: orphaned build environments can leak cost, data, or credentials.
- Duplicate jobs: retries can trigger duplicate repository pushes, previews, or deployments without idempotency.
- Replayed approvals: an old approval can be reused if executor idempotency and status transitions are weak.
- Resource exhaustion: builds can consume CPU, memory, disk, network, or paid provider quota.
- Deployment ownership: deployments must prove they belong to the user/workspace and approved checkpoint.

## Required Before Real Builds

- Isolated worker runtime with per-project credentials and no ALMA secrets.
- Network egress policy and SSRF protections.
- Signed provider callbacks with nonce/replay checks.
- Dependency install sandboxing, timeout, and quota enforcement.
- Structured command allowlists in the worker plane.
- Redacted log ingestion with maximum length and secret scanning.
- Repository, preview, and deployment provider adapters with verified ownership.
- Approval executors for Builder actions with idempotency and terminal-state guards.
- Cleanup jobs for stale sessions, workspaces, artifacts, and previews.

Until those are complete, Builder remains a product foundation and project planning surface only.
