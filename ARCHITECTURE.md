# ALMA architecture

## Canonical orchestration path

The current canonical runtime entry point is `app/api/chat/stream/route.ts`.

1. Authenticate the user and enforce the existing subscription gate.
2. Create or load a conversation and persist the user message.
3. Extract and preserve user memory through the compatibility memory path.
4. Load Alma context, build a deterministic plan, and lazily create the user's default `ALMA` agent.
5. Start an `agent_executions` record, activity entry, and plan step without changing the streamed chat contract.
6. Route image, planned, finance, tool-assisted, and general-chat execution through the existing behavior.
7. Persist redacted execution results, append-only steps, activity records, and terminal status.

`lib/alma/*` is the canonical orchestration namespace. The chat route is currently the compatibility adapter that invokes it while preserving the existing UI and streaming protocol.

## Planner

`lib/alma/planner` builds the deterministic Alma plan from `lib/alma/brain.ts`. The legacy simple business planner remains compatible during Phase 1. Future planning improvements must extend this canonical planner rather than create a second execution path.

## Memory

Existing `memories` storage remains operational for compatibility. Phase 1 mirrors extracted and manually saved memories to `agent_memories` for the user's default agent. `alma_context_state` remains short-term, conversation-specific context, especially for image follow-up. Memory consolidation belongs to a later approved phase.

## Execution and reflection

`lib/alma/execution` executes supported plans, and `lib/alma/reflection` summarizes outcomes. Phase 1 adds durable agent execution records, append-only ordered steps, activity logs, guarded terminal status updates, and redaction. Existing chat output remains unchanged.

## Tools

`lib/ai/tools/registry.ts` remains the canonical executable tool registry. Existing tool implementations and module gates remain intact. Tool permissions and approval enforcement are deliberately not enabled until the approved Phase 2 work begins.

## Agents, permissions, and approvals

Phase 1 adds a persisted `agents` foundation. The default `ALMA` agent is lazily created per user and protected by `unique(user_id, slug)`.

`agent_permissions` and `agent_approvals` are durable data foundations only. Policies and approval workflow enforcement are not yet wired into tool execution. Do not bypass the existing authorization model before that work is explicitly approved.

## Supabase Phase 1 tables

- `agents`: user-owned agent identity and configuration.
- `agent_memories`: agent-scoped durable memory.
- `agent_tasks`: future manual/one-time/recurring work definitions.
- `agent_executions`: durable runs from chat, manual, scheduled, or event triggers.
- `agent_execution_steps`: ordered, append-only plan/tool/approval/verification/reflection records.
- `agent_approvals`: pending and resolved approval records.
- `agent_permissions`: future allow/deny/approval rules.
- `agent_activity_logs`: user-visible execution history.

All Phase 1 tables use RLS. Child records validate ownership through their parent agent and, where applicable, execution and execution step. Execution and audit payloads are redacted server-side before persistence.

## Compatibility contract

Phase 1 must not change existing routes, chat streaming syntax, image rendering, module behavior, current conversation storage, or the rendered product design. The new agent foundation degrades safely if a migration is not present, though production deployments must apply the migration.

## Roadmap

- Phase 1: persisted agent identity, execution/audit foundation, RLS, redaction, and chat compatibility.
- Phase 2: permission evaluation and approval-gated tool execution.
- Phase 3: unified memory, structured plans, verification, retries, and reflection.
- Phase 4: reusable connection framework for Google, ElevenLabs, Stripe, CRM, fitness, and future providers.
- Phase 5: durable scheduler/workers for recurring autonomous tasks.
- Phase 6: voice-agent integration through the same central agent brain.
- Phase 7: hardening, tests, schema cleanup, and legacy-path retirement after migration.

## Systems that must not be duplicated

Do not add another agent runtime, planner, memory store, executor, reflection engine, tool registry, connection framework, permission engine, approval store, or activity-log system. Extend the systems documented here and migrate legacy callers through compatibility adapters.
