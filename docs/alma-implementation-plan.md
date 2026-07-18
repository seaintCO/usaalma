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
