# Durable Chat Rollout

## Readiness

Status: READY FOR LIVE DEPLOYMENT TEST

This guide covers the existing durable background chat path. Do not enable
`ALMA_DURABLE_CHAT_ENABLED=true` in production until the migration, worker
deployment, scheduled retry sweep, and live smoke tests below all pass.

The legacy `/api/chat/stream` route remains the rollback path when
`ALMA_DURABLE_CHAT_ENABLED=false`.

## Architecture

- `chat_runs` is the durable queue.
- `agent_executions` is the durable execution record.
- `agent_execution_steps` records idempotent plan/tool steps.
- `messages.execution_id` links assistant messages to executions.
- `supabase/functions/process-chat-run/index.ts` owns queue claiming and
  claim-token completion/failure.
- `app/api/internal/chat-runs/process/route.ts` is the secured application
  processor invoked only by the worker.
- `app/api/chat/runs/*` exposes authenticated enqueue/status/config routes.
- `app/api/chat/conversation-status/route.ts` returns active, failed, and
  unread state for all conversations in one request.
- `app/api/chat/conversations/[conversationId]/read/route.ts` marks a
  conversation read idempotently.

## Migration Order

Apply migrations in order. Do not run these automatically from application
startup.

```bash
npx supabase migration list --linked
npx supabase db push --linked --dry-run
npx supabase db push --linked
```

Durable chat requires these migrations in production:

1. `20260713_alma_agent_foundation.sql`
2. `20260714_alma_durable_chat_queue.sql`

The queue migration is additive and includes:

- `chat_runs`
- `conversation_user_state`
- `messages.execution_id`
- one assistant message per execution index
- user idempotency index
- tool and step idempotency indexes
- `claim_chat_run`
- `complete_chat_run`
- `fail_chat_run`
- ownership triggers and RLS policies

## Required Secrets

Do not print real secret values in logs, pull requests, or support notes.

### Vercel

- `ALMA_DURABLE_CHAT_ENABLED`
- `CHAT_RUN_WORKER_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_FUNCTION_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- canonical ALMA model variables used by `lib/alma/modelRouter.ts`

`SUPABASE_FUNCTION_URL` should point directly to the deployed
`process-chat-run` function endpoint.

### Supabase Edge Function

- `CHAT_RUN_WORKER_SECRET`
- `ALMA_APP_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

`ALMA_APP_URL` must be the canonical deployed application origin, without a
trailing slash.

Set function secrets:

```bash
npx supabase secrets set \
  CHAT_RUN_WORKER_SECRET="<secret>" \
  ALMA_APP_URL="https://<canonical-app-domain>" \
  SUPABASE_URL="https://<project-ref>.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

## Deploy The Worker

Deploy the Edge Function without JWT verification. The shared worker secret is
the authentication boundary.

```bash
npx supabase functions deploy process-chat-run --no-verify-jwt
```

Manual worker invocation:

```bash
curl -X POST "https://<project-ref>.functions.supabase.co/process-chat-run" \
  -H "x-chat-run-worker-secret: <secret>"
```

Expected no-job response when the queue is empty:

```json
{ "outcome": "no_job" }
```

## Worker Invocation And Retry Sweep

The enqueue route attempts a best-effort worker trigger when both
`SUPABASE_FUNCTION_URL` and `CHAT_RUN_WORKER_SECRET` are configured. That
best-effort trigger is not the only worker lifecycle mechanism.

Configure a secured Supabase cron or external scheduler to invoke the same
function every minute. The claim RPC reclaims:

- queued runs
- retryable runs whose `available_at` has arrived
- running runs whose lease expired

Do not create another queue or worker lifecycle owner.

## Queue And Lease Safety

`claim_chat_run`:

- uses `FOR UPDATE SKIP LOCKED`
- claims one run
- increments attempts
- sets `claim_token`
- sets `lease_expires_at`
- marks the linked execution running

`complete_chat_run`:

- requires the claim token
- only completes a running queue row
- clears the execution claim token and lease
- tolerates the canonical processor already completing the execution

`fail_chat_run`:

- requires the claim token
- schedules retry only while attempts remain
- records a redacted error
- clears the execution claim token and lease
- does not reopen completed queue rows

## Idempotency Rules

- Client submission uses a stable `idempotencyKey`.
- `chat_runs` is unique by user, agent, and idempotency key.
- `agent_executions` has durable idempotency by user, agent, and key.
- User messages have a conversation/idempotency guard.
- Assistant messages are linked by `execution_id`.
- The database allows one assistant message per execution.
- Durable retries reuse an existing assistant message for an execution.
- Tool/image side effects are guarded by execution step and tool/image
  idempotency keys where implemented.

## Dashboard Resume Behavior

Expected behavior after deployment:

1. User submits a durable run and receives a `runId`.
2. Browser may close after enqueue.
3. Worker continues independently.
4. User returns to `/dashboard`.
5. `/api/chat/conversation-status` shows active, failed, or unread state.
6. Opening `/dashboard?conversation=<id>` loads persisted messages and active
   execution-linked drafts from `/api/chat/conversations/<id>/runs`.
7. A persisted assistant message replaces the local draft after completion.
8. Opening the conversation marks it read.

Do not claim browser-close continuation is production verified until the live
smoke sequence below passes against deployed Vercel and Supabase.

## Post-Deployment SQL Checks

```sql
select version
from supabase_migrations.schema_migrations
where version in ('20260713', '20260714');

select relname, relrowsecurity
from pg_class
where relname in ('chat_runs', 'conversation_user_state');

select execution_id, count(*)
from chat_runs
group by execution_id
having count(*) > 1;

select execution_id, count(*)
from messages
where role = 'assistant' and execution_id is not null
group by execution_id
having count(*) > 1;

select execution_id, step_key, count(*)
from agent_execution_steps
where step_key is not null
group by execution_id, step_key
having count(*) > 1;

select status, count(*)
from chat_runs
group by status
order by status;

select id, status, attempts, max_attempts, lease_expires_at, last_error
from chat_runs
where status = 'running' and lease_expires_at < now();
```

Expected duplicate queries return zero rows.

## Live Smoke Tests

Run first with `ALMA_DURABLE_CHAT_ENABLED=false`:

1. Deploy application code.
2. Confirm legacy `/api/chat/stream` still works.
3. Confirm no durable queue entries are required for normal chat.

Then enable durable chat in a controlled environment:

1. Set `ALMA_DURABLE_CHAT_ENABLED=true`.
2. Send a normal text chat.
3. Confirm `chat_runs.status` transitions `queued -> running -> completed`.
4. Confirm `agent_executions.status` transitions to `completed`.
5. Confirm exactly one assistant message exists for the execution.
6. Send a long response request, close the browser, wait for worker completion,
   reopen `/dashboard?conversation=<id>`, and confirm the final response
   hydrates.
7. Submit two conversations concurrently and confirm independent active
   indicators.
8. Force a temporary worker failure, confirm retryable state, and confirm the
   scheduler later completes or terminally fails the run.
9. Force a non-retryable processor failure, confirm failed indicator and
   redacted `last_error`.
10. Open the conversation and confirm unread clears idempotently.
11. Disable `ALMA_DURABLE_CHAT_ENABLED`, redeploy, and confirm legacy chat still
    works without schema rollback.

## Rollback

1. Set `ALMA_DURABLE_CHAT_ENABLED=false` in Vercel.
2. Redeploy Vercel.
3. Keep queue tables, migrations, and Edge Function deployed.
4. Confirm `/api/chat/stream` works.
5. Inspect unfinished queue rows before re-enabling durable chat.

Rollback does not require dropping queue tables or reverting schema migrations.

## Queue Inspection

Useful operational queries:

```sql
select id, conversation_id, status, attempts, max_attempts, available_at,
       claimed_at, lease_expires_at, last_error, created_at, updated_at
from chat_runs
order by created_at desc
limit 50;

select id, execution_id, status, attempts, lease_expires_at, last_error
from chat_runs
where status in ('queued', 'retryable', 'running')
order by available_at asc;
```

## Stuck-Run Recovery

Prefer recovery by scheduler invocation. If manual intervention is required:

1. Inspect the row and related execution/message records.
2. Confirm no worker is actively processing the claim token.
3. Invoke `process-chat-run` once manually.
4. If the lease is expired, the next claim can reclaim it.
5. Do not directly mark a run completed unless the assistant message and
   execution result are already persisted and verified.

## Log Redaction Rules

- Never log prompts, message content, API keys, bearer tokens, service-role
  keys, OAuth tokens, or raw provider responses.
- Worker errors should use short redacted messages.
- Application trigger logs may include `runId` only.
- Internal processor errors may include stable error classes/messages but not
  secrets or prompt bodies.
