# ALMA Target Architecture

## Product North Star

ALMA is one bilingual assistant with modular abilities. Users should experience one account, one Alma, one memory system, one file system, one approval center, one billing system, and one activity history.

Commercial priority:

1. Alma Office
2. Free personal tools
3. Alma Creator
4. Alma Studio
5. Alma Trader
6. Alma Fitness

Modules should feel like Alma abilities, not disconnected apps.

## Primary Frontend Model

Primary navigation:

- Home
- Alma
- Approvals
- Files
- Apps

Secondary navigation:

- Connections
- Billing
- Settings

Mobile navigation:

- Home
- Alma
- Approvals
- Apps
- Profile

Mapping to current routes:

- Home: current `/dashboard` home, simplified.
- Alma: current `/dashboard` chat state and conversation history.
- Approvals: new route backed by agent/global approval records.
- Files: first wraps Documents and private file records; later unifies file search and storage references.
- Apps: simplified launcher/catalog backed by current `WORKSPACE_ROUTES` and Marketplace.
- Connections: current Marketplace connection details and OAuth state, likely route alias or focused view.
- Billing: current `/billing`.
- Settings/Profile: current `/settings` plus account profile controls.

## Shell Principles

- Preserve `AlmaShell` as the canonical shell.
- Preserve `WORKSPACE_ROUTES` as the canonical route registry.
- Do not create a second navigation system. Create presentation layers that consume the existing route registry and Marketplace/module metadata.
- Use progressive disclosure: Home shows only the command surface, critical alerts, approvals, and a few shortcuts.
- Apps should reveal module details only after a user opens it.
- Workspace pages should not include duplicate `Back to ALMA` links inside the shell.

## Core Platform Services

### Account, User, Tenant, Workspace

Current state is mostly single-user `user_id` ownership. Target state should add a shared workspace/tenant model without deleting or rewriting existing tables.

Additive direction:

- Formalize `workspaces` as tenant/business containers.
- Add membership and role policies.
- Add optional `workspace_id` to new Office records first.
- Backfill or adapt legacy single-user records through compatibility views/services only after stable.
- Preserve `user_id` for ownership/audit even when `workspace_id` exists.

### Module Registry

Canonical source:

- `lib/platform/marketplace/catalog.service.ts`
- `lib/platform/workspaceRoutes.ts`

Target:

- One typed module registry with route, release state, plan entitlement key, category, app group, required connections, capabilities, and risk level.
- Marketplace becomes the detailed catalog and install surface.
- Apps becomes the simple launcher.

### Subscription Entitlements

Current logic is split among billing, modules, and Marketplace.

Target:

- `lib/platform/entitlements` service.
- Inputs: subscription record, module registry, usage/credit state, feature flags.
- Outputs: allowed, blocked, upgrade required, coming soon, requires setup.
- Used by API route guards, Marketplace, Apps, tool execution, and shell labels.

### Usage And Credits

Current image credits exist under `lib/usage/imageCredits.ts`. Target:

- General `usage_events` or `usage_ledger` table.
- Credit balances by account/workspace and feature.
- Idempotency key for billable actions.
- No fake usage claims; only log real attempted/completed actions.

### Tool Registry

Preserve:

- `lib/ai/tools/registry.ts` as current executable registry.
- `lib/alma/tools/registry.ts` as orchestration namespace adapter.

Target:

- Typed tool definitions with risk class:
  - internal automatic
  - external approval-required
  - protected financial/destructive
- Each tool declares required module, required connection, approval policy, idempotency behavior, and audit metadata.
- Tool execution must always log an action audit entry.

### Approval Queue

Current foundation:

- `agent_approvals`
- `AgentApprovalRepository`
- `requestAlmaApproval`

Target:

- User-facing `/approvals`.
- Global approval service that can read agent approvals and future non-agent approvals.
- Approval states: pending, approved, edited, cancelled, expired, executed, failed.
- Actions:
  - Approve
  - Edit
  - Cancel
- Every approval logs requested payload, redacted arguments, edited payload, approver, timestamp, final execution result, and failure reason.
- External email sends, payment links, destructive deletes, deployments, and financial state changes should require approval unless explicitly configured otherwise.

### Action Audit Log

Current partial sources:

- `agent_activity_logs`
- `agent_executions`
- `agent_execution_steps`
- `tool_runs`
- resource-specific updated records

Target:

- Unified activity feed service that aggregates existing sources.
- Optional additive `action_audit_logs` table for cross-module approvals and non-agent actions.
- Audit records must be append-only for protected actions.

### OAuth Connection Framework

Current foundation:

- `oauth_connections`
- Google Workspace OAuth routes.
- Stripe Connect routes.
- voice custom integration records.

Target:

- Provider registry with real states: unavailable, setup required, connect, connected, reconnect required, disconnected.
- No mock successful states in production.
- Token refresh, revocation, reconnect errors, granted scopes, and provider identity visible to the user.
- Provider credentials never exposed to browser.

### Notification Framework

Current state:

- Settings route exposes notification preferences.
- No general notification table was identified.

Target:

- Additive notification records for pending approvals, failed runs, provider reconnect, billing action required, and Office follow-ups.
- Home should show only the most important one to three alerts.

### Background Jobs

Current foundation:

- Durable chat runs.
- Internal route `/api/internal/chat-runs/process`.
- Optional Supabase function worker with `CHAT_RUN_WORKER_SECRET`.

Target:

- General background job registry that preserves durable chat worker behavior.
- Jobs must support idempotency, ownership, retries, terminal status, and audit logs.
- Do not add a second worker pattern unless it adapts to the durable job model.

### Private Knowledge And Files

Current state:

- Documents table and private `alma-documents` bucket.
- Construction private `alma-construction` bucket.
- Generated images table stores base64 records.

Target:

- Files route aggregates user-owned documents, uploads, generated assets, construction files, and future Office attachments.
- Private signed download only.
- Knowledge search uses existing document embeddings where available.
- Do not merge storage buckets destructively; provide one user-facing file system over existing storage.

### Unified Command Routing

Current foundation:

- `lib/alma/brain.ts`
- `lib/alma/planner`
- `lib/ai/router/*`
- chat run processors

Target:

- One command router that classifies intent, determines module/connection/approval needs, and either executes safely or creates an approval.
- Spanish-first bilingual behavior.
- User-entered content is not auto-translated.

## Alma Office Target

Alma Office should be the first paid, production-complete path.

Core records:

- Customers and contacts: current CRM `contacts`, `companies`, `opportunities`, `crm_activities`.
- Services and pricing: new additive Office records.
- Estimates: new additive Office estimate records linked to CRM and optionally Construction project data.
- Invoices: current `invoices` and `invoice_line_items`.
- Deposits/payment links: use Stripe only after real connection and approval flow.
- Email drafts/sends: use Google OAuth only after connection and approval flow.
- Follow-up scheduling: current Tasks/Planner records.
- Project photo upload/preliminary analysis: can reuse Documents/Construction/Image analysis patterns with explicit disclaimers.
- Website assistant: should not be prioritized until Office core is stable.

Office safety:

- Estimates are not invoices.
- Deposits and payment links are not marked paid until real Stripe state confirms them.
- Email sends must require approval.
- Destructive financial changes require approval.
- QuickBooks, Microsoft, WhatsApp are connector framework entries until real OAuth/token/error states exist.

## Release Labels

Use truthful states:

- Active: end-to-end verified production path.
- Beta: useful but requires manual review or has documented limitations.
- Coming soon: not executable.
- Requires setup: executable only after a real provider connection/configuration.

## Data Protection

Non-negotiables:

- All user/workspace data protected by RLS.
- Server repository ownership filters remain mandatory.
- Service role only in server-only trusted contexts.
- Signed URLs only for private files.
- No provider secrets in browser.
- Additive migrations only.
- No weakening ownership policies to speed up UI work.
