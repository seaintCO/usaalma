# ALMA AI workspaces beta status

## Release labels

| Workspace | Label | Working workflows | Beta limitations |
| --- | --- | --- | --- |
| Images | Production-safe | Owned generation, upload, edit, history, download, delete, aspect ratio, quality, server-side model validation. | Client retry behavior requires smoke testing after every release. |
| Creative Studio | Beta-only | Brand-kit, campaign, folder and asset creation; canonical image generation; owned asset history; read-only detail APIs. | Edit/delete lifecycle UI, campaign archive/restore UI, folder lifecycle UI, and asset revision/version UI are incomplete. |
| Launch Studio | Beta-only | Create, save/resume, active projects, archive/delete APIs, exports, ALMA and Creative handoffs. | Archived restore UI, page-level stable duplicate key, and Creative/Image relationship persistence are deferred. |
| Trader | Beta-only | Owned watchlist/journal/analysis persistence, educational chart analysis, screenshot ownership, basic performance totals, no-price/no-brokerage posture. | Watchlist editing/filtering, analysis editing/filtering, full journal lifecycle/breakdowns, and chat-uploaded chart attachment are deferred. |

## Required migrations

Apply in repository order through `20260715012000_alma_trader_workspace.sql`. The corrective `20260715013000_alma_ai_workspace_closeout.sql` remains unapplied and should be reviewed before any workflow depends on its fields or triggers.

## Required environment

- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Server-only Supabase service credentials where existing durable worker paths require them.
- Approved model variables from `lib/ai/models.ts`; image generation uses the centralized image model configuration.

## Smoke tests

1. Images: generate, retry, upload, edit, download, delete, and cross-user denial.
2. Creative: create brand kit/campaign/folder/asset; open owned detail; confirm no cross-user detail leaks.
3. Launch: create/save/reopen/archive/delete/export; open ALMA and Creative handoffs.
4. Trader: add/remove watchlist symbol, upload/analyze chart, save analysis/journal row, verify null metrics remain unavailable, and confirm no broker/live-price claims.
5. Verify EN/ES labels without modifying stored user content.

## Rollback

Runtime rollback is a deployment rollback to the prior application commit. Do not roll back applied additive Supabase migrations destructively; disable affected UI entry points or deploy the prior compatible application instead. Preserve user-owned records.

## Marketplace gate

Marketplace work may begin only as a separate beta-stage effort. These AI workspace limitations remain documented and must not be represented as production-complete lifecycle workflows.
