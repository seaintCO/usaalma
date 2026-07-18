# ALMA Current Audit

Date: 2026-07-18

This audit reflects the checked-in repository at commit `cb31d90 feat(alma): complete Construction Blueprint MVP`.

## Baseline Verification

Commands run:

```powershell
npm run check:encoding
npx tsc --noEmit
npm run lint
npm run build
```

Results:

- Encoding check: pass.
- TypeScript: pass.
- ESLint: pass with warnings. Current baseline reports 234 warnings, mostly `no-explicit-any`, React `set-state-in-effect`, raw `img`, and unused symbols.
- Production build: pass. Next.js 16.2.9 generated 203 app routes.
- Working tree before documentation edits: clean.

Important note: `npm run check:encoding` passes, but manual source inspection still found mojibake in older strings such as `lib/alma/brain.ts`, `lib/ai/tools/registry.ts`, `app/crm/page.tsx`, and `app/invoicing/page.tsx`. The checker should be strengthened before declaring encoding fully stabilized.

## Current Route Inventory

Primary pages:

- Marketing/auth: `/`, `/login`, `/signup`, `/forgot-password`, `/auth/loading`, `/auth/update-password`, `/pricing`, `/onboarding`.
- Shell workspaces: `/dashboard`, `/tasks`, `/notes`, `/planner`, `/documents`, `/fitness`, `/crm`, `/invoicing`, `/images`, `/creative`, `/launch-studio`, `/trader`, `/agents`, `/construction`, `/marketplace`, `/billing`, `/settings`.
- Partial or legacy/admin surfaces: `/admin`, `/admin/calls`, `/dashboard/apps`, `/finance`, `/journal`, `/notifications`, `/presentations`, `/receptionist`, `/search`, `/sites-v2`, `/tools`, `/voice-connections`, `/workflows`, `/workflows/runs`, `/workspaces`.

API surface is broad and includes:

- Auth/onboarding/billing/subscription.
- Chat/conversations/durable runs.
- Agent Builder and agent activity/memory/tools.
- CRM, invoices, documents, construction, images, fitness, trader, creative, launch studio.
- OAuth Google/Stripe and custom voice integration endpoints.
- Workflow/workspace/receptionist/sites/presentations/finance utilities.

## Layout And Navigation

Canonical workspace route registry:

- `lib/platform/workspaceRoutes.ts`

Canonical shared shell:

- `components/alma-shell/AlmaShell.tsx`
- `components/alma-shell/AlmaDesktopSidebar.tsx`
- `components/alma-shell/AlmaMobileDrawer.tsx`
- `components/alma-shell/WorkspaceNavigation.tsx`
- `components/alma-shell/WorkspaceHeader.tsx`

Current shell behavior:

- Desktop sidebar exposes all modules grouped as Core, Business, AI, Platform.
- Mobile drawer exposes the same broad list.
- Dashboard owns Home/Chat state, conversation loading, URL state, durable chat config, conversation status polling, and file analysis.
- Workspace pages are wrapped in `AlmaShell`, but some still include redundant in-page `ALMA` back links.

Target mismatch:

- The requested target navigation is Home, Alma, Approvals, Files, Apps with secondary Connections, Billing, Settings. Current navigation is module-first and exposes too much detail immediately.
- There is no production `Approvals` page yet.
- There is no unified `Files` page; Documents exists as private text/file knowledge and Construction has a separate private storage bucket.
- `Apps` is currently represented by Marketplace, module list/install APIs, and a legacy `/dashboard/apps`.

## Dashboard And Chat

Dashboard page:

- `app/dashboard/page.tsx`

Dashboard home:

- `components/dashboard-home/OperatingDashboard.tsx`
- Fetches `/api/dashboard/summary`.
- Shows greeting, focus items, ten quick actions, productivity blocks, active runs, fitness snapshot, recent activity, and notable conversations.

Current problem:

- The home page is functional but still too dashboard-like. It exposes too many actions and panels on the first screen for the desired central assistant experience.

Chat:

- `components/dashboard-chat/ChatWorkspace.tsx`
- Supports legacy streaming and durable enqueue/poll.
- Provides user-facing retry/error cards.
- Uses `/api/chat/stream`, `/api/chat/runs`, `/api/chat/runs/[runId]`, and conversation APIs.

Preserve:

- Durable chat transport, idempotency, polling, retry state, and conversation URL behavior.

## Authentication And Session Flow

Core files:

- `lib/auth/user.ts`
- `lib/supabase/server.ts`
- `lib/supabase/admin.ts`
- `lib/supabase/client.ts`
- `lib/api/requirePaidUser.ts`

Current behavior:

- Supabase SSR client is canonical for user-session routes.
- Service-role admin client is used server-side for privileged work.
- `lib/supabase/server.ts` can return an admin client when `x-chat-run-worker-secret` matches `CHAT_RUN_WORKER_SECRET`.
- Demo mode can synthesize a local demo user when `NEXT_PUBLIC_DEMO_MODE=true`.
- Paid route helper enforces subscription unless `NEXT_PUBLIC_BETA_MODE=true`.

Risks:

- Demo and beta bypasses must remain explicitly environment-gated and should be documented as non-production settings.
- Some repository methods use admin clients where regular RLS clients would be safer for read-only user state; keep server ownership filters as a hard requirement.

## Stripe Billing

Core files:

- `lib/stripe/server.ts`
- `app/api/billing/checkout/route.ts`
- `app/api/billing/webhook/route.ts`
- `app/api/billing/portal/route.ts`
- `app/api/billing/plans/route.ts`
- `lib/db/repositories/billing/subscription.repository.ts`
- `supabase/migrations/20260706_alma_app_subscriptions.sql`

Current behavior:

- Checkout creates Stripe sessions by plan.
- Webhook verifies signature and upserts `subscriptions` using service role.
- Plan mapping uses `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PERSONAL`, `STRIPE_PRICE_PRO`, and `STRIPE_PRICE_BUSINESS`.
- Entitlement logic is split across `requirePaidUser`, `lib/billing/access.ts`, `lib/modules/plans.ts`, and Marketplace catalog access calculation.

Gaps:

- No formal usage/credit ledger for non-image features.
- Entitlement logic is not yet centralized as a first-class subscription entitlement service.
- `allowedModulesForPlan` has duplicate `image_generator` in the business plan list.

## Agent Orchestration, Memory, Tools, And Approvals

Architecture contract:

- `ARCHITECTURE.md` identifies `app/api/chat/stream/route.ts` as the canonical runtime adapter and `lib/alma/*` as the canonical orchestration namespace.
- `lib/ai/tools/registry.ts` remains the canonical executable tool registry according to current architecture docs.

Key files:

- `lib/alma/brain.ts`
- `lib/alma/planner/index.ts`
- `lib/alma/execution/index.ts`
- `lib/alma/reflection/index.ts`
- `lib/alma/chat/processChatRun.ts`
- `lib/alma/chat/processPlannerAndToolChatRun.ts`
- `lib/ai/tools/registry.ts`
- `lib/db/repositories/agents/*`
- `lib/services/agents/agent.service.ts`

Current state:

- Agent identity, memory mirroring, executions, steps, approvals, permissions, and activity logs exist in schema and repositories.
- Agent Builder V1 exists at `/agents`.
- Tool execution records `tool_runs`.
- Tool permissions and approval enforcement are not fully wired into execution.
- `requestAlmaApproval` can create an approval record, but there is no complete user approval center with approve/edit/cancel execution loop.

Risks:

- Some user-facing planner/tool status strings contain mojibake.
- Tool registry is large, loosely typed, and uses module checks inconsistently.
- Gmail send/draft tools are executable through Google tokens but need approval gating before any external send path is considered production-safe.

## Memory And Conversation Storage

Current storage:

- Conversations and messages are managed through `lib/db/repositories/conversation.repository.ts`, `message.repository.ts`, and `/api/conversation/*`.
- Durable chat adds `chat_runs` and `conversation_user_state`.
- Legacy `memories` and newer `agent_memories` coexist.
- `alma_context_state` is used for short-term image/chat context.

Target mismatch:

- User-facing memory is not yet unified into one clear settings/control surface.
- The target "one Alma, one memory system" should be implemented by consolidating callers behind `lib/alma/memory` without deleting existing data.

## Marketplace, Modules, And Connections

Core files:

- `lib/platform/marketplace/catalog.service.ts`
- `components/marketplace/*`
- `app/marketplace/page.tsx`
- `app/api/marketplace/catalog/route.ts`
- `app/api/modules/install/route.ts`
- `lib/db/repositories/modules/module.repository.ts`
- `lib/modules/plans.ts`
- `lib/db/repositories/oauth/oauth.repository.ts`

Current behavior:

- Marketplace is metadata-driven and combines internal modules with provider connections.
- Module install records are user-owned.
- Connection state resolves from `oauth_connections` and voice provider configuration.
- Google Workspace and Stripe Connect have OAuth routes; some provider entries remain coming soon.

Gaps:

- Marketplace is not the same thing as target "Apps"; it needs to become the detailed app catalog behind a simpler Apps entry.
- `app/api/oauth/connect/route.ts` still calls `OAuthRepository.mockConnect`; that endpoint is demo-only and should not be used as a real provider connection.
- OAuth credentials are stored with an `encrypted_secret` field available, but token fields such as access/refresh token require continued review to ensure encrypted-at-rest behavior is consistent.

## Workspace Feature Status

Working or mostly working:

- Dashboard/chat with durable run support.
- Tasks, Notes, Planner, Documents, Images, Trader, Fitness, Agent Builder, Construction Blueprint.
- Billing checkout/webhook/portal structure.
- Marketplace catalog/module install structure.

Working but visually or structurally uneven:

- CRM: persists contacts, companies, opportunities, activities, but UI is simple and contains mojibake.
- Invoicing: supports drafts, line items, lifecycle, PDF download, duplicate, but email sending is explicitly unavailable until provider connection.
- Creative Studio and Launch Studio: persistence exists, but several APIs are demo/live-demo oriented rather than Office-first product workflows.

Partial, demo-only, or risky:

- `/api/oauth/connect` uses mock connection.
- `/dashboard/apps` appears legacy.
- Workflows and Workspaces have repositories/routes but are not yet part of a coherent tenant/workspace model.
- Receptionist/voice features depend on Twilio/ElevenLabs credentials and need end-to-end verification.
- Sites/Launch Studio export/deploy routes can create demo artifacts and Vercel deploys if token exists; this must be protected by approvals and clear release labeling.
- Admin pages are present but not audited for production authorization controls in this pass.

## Supabase Schema Inventory

Existing migrations:

- `20260706_alma_app_subscriptions.sql`
- `20260713_alma_agent_foundation.sql`
- `20260714_alma_durable_chat_queue.sql`
- `20260715002000_alma_tasks_workspace.sql`
- `20260715003000_alma_notes_workspace.sql`
- `20260715004000_alma_planner_workspace.sql`
- `20260715005000_alma_documents_workspace.sql`
- `20260715006000_alma_fitness_workspace.sql`
- `20260715007000_alma_crm_workspace.sql`
- `20260715008000_alma_invoicing_workspace.sql`
- `20260715009000_alma_images_workspace.sql`
- `20260715010000_alma_creative_studio.sql`
- `20260715011000_alma_launch_studio_workspace.sql`
- `20260715012000_alma_trader_workspace.sql`
- `20260715013000_alma_ai_workspace_closeout.sql`
- `20260715015000_alma_google_workspace_connection.sql`
- `20260715016000_alma_settings_preferences.sql`
- `20260715017000_alma_agent_builder.sql`
- `20260715018000_alma_construction_workspace.sql`

RLS:

- Recent workspace tables are generally RLS-protected by `user_id`.
- OAuth migration revokes direct table access from anon/authenticated and grants service role.
- Construction includes private `alma-construction` storage with owner-path policy.
- Documents include private `alma-documents` storage.

Gaps:

- There is no formal shared tenant/workspace membership model used across core data.
- Existing `workspaces` and `workspace_invites` are not yet connected to every business record.
- No global approval queue table beyond agent-specific approvals.
- No general notification table was identified.
- No general action audit log beyond agent activity/execution/tool runs.

## Environment Variables

Identified variables:

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- App/runtime: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_DEMO_MODE`, `NEXT_PUBLIC_BETA_MODE`, `ALMA_DURABLE_CHAT_ENABLED`, `CHAT_RUN_WORKER_SECRET`, `SUPABASE_FUNCTION_URL`.
- OpenAI: `OPENAI_API_KEY`.
- Stripe billing: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PERSONAL`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`.
- Stripe Connect: `STRIPE_CLIENT_ID`, `STRIPE_REDIRECT_URI`.
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
- Launch deployment: `VERCEL_TOKEN`.
- Fitness food search: `USDA_FDC_API_KEY`, legacy `FDC_API_KEY`.

## Top Stabilization Findings

1. The product surface is too module-first; navigation should become assistant-first.
2. Approvals exist as data foundation but are not yet a complete approve/edit/cancel product flow.
3. Entitlements are split across multiple modules and need one service.
4. Shared workspace/tenant architecture is not yet the ownership basis for Office.
5. Encoding checker misses user-visible mojibake in older code paths.
6. CRM and Invoicing are real but need Office-grade UI, service/pricing records, estimates, deposits/payment links, and email approvals.
7. OAuth framework is real for Google/Stripe routes, but mock connection and coming-soon provider states must be clearly separated from production.
8. Files/Documents/Construction storage are private but not yet a single user-facing Files system.
9. Many lint warnings are tolerated by current config and should be reduced gradually, not in one risky sweep.
10. The baseline passes build and type checks, so stabilization can proceed incrementally.
