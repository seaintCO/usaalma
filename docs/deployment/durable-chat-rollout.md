# Durable chat rollout

## Readiness: NOT READY

Do not deploy the durable queue yet. The legacy `/api/chat/stream` route remains
the production path when `ALMA_DURABLE_CHAT_ENABLED=false`.

### Blocking audit findings

1. The migration enables RLS on `chat_runs` and `conversation_user_state`, but
   needs explicit ownership/worker policies for execution-linked message and
   queue mutation boundaries before production deployment.
2. The Edge Function returns an error after an unexpected exception; the lease
   will be reclaimed, but the worker should explicitly release/fail its claimed
   run with the claim token first.
3. Dashboard durable polling tracks a submitted visible run, but fresh
   conversation hydration does not yet restore all active drafts after reload.

Resolve these before changing the rollout flag to `true`.

## Required configuration

Vercel: `CHAT_RUN_WORKER_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_FUNCTION_URL`, `ALMA_DURABLE_CHAT_ENABLED`, `OPENAI_API_KEY`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_APP_URL`.

Edge Function: `CHAT_RUN_WORKER_SECRET`, `ALMA_APP_URL`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`. Set `ALMA_APP_URL=https://www.seaintalma.com`
only after confirming that is the canonical production domain.

## Deployment order after blockers are resolved

```bash
git status --short
npx supabase migration list --linked
npx supabase db push --linked --dry-run
npx supabase db push --linked
npx supabase secrets set CHAT_RUN_WORKER_SECRET="<secret>" ALMA_APP_URL="https://www.seaintalma.com" SUPABASE_URL="https://<ref>.supabase.co" SUPABASE_SERVICE_ROLE_KEY="<service-role>"
npx supabase functions deploy process-chat-run --no-verify-jwt
```

Deploy application code first with `ALMA_DURABLE_CHAT_ENABLED=false`; wait for
Vercel Ready, apply only migration `20260714_alma_durable_chat_queue.sql`, set
secrets, deploy the worker, run one controlled job, then enable the flag and
redeploy.

Manual worker test:

```bash
curl -X POST "https://<ref>.functions.supabase.co/process-chat-run" -H "x-chat-run-worker-secret: <secret>"
```

Recommended retry sweep: invoke that same endpoint every 1 minute from a
secured Supabase cron/HTTP scheduler. `claim_chat_run` reclaims queued,
retryable, and lease-expired runs.

## Post-deployment checks

```sql
select version from supabase_migrations.schema_migrations where version = '20260714';
select relname, relrowsecurity from pg_class where relname in ('chat_runs','conversation_user_state');
select execution_id, count(*) from chat_runs group by execution_id having count(*) > 1;
select execution_id, count(*) from messages where role='assistant' and execution_id is not null group by execution_id having count(*) > 1;
select execution_id, step_key, count(*) from agent_execution_steps where step_key is not null group by execution_id, step_key having count(*) > 1;
select status, count(*) from chat_runs group by status;
select * from chat_runs where status='running' and lease_expires_at < now();
select * from conversation_user_state limit 20;
```

Smoke test durable chat, long response while switching chats, browser close/reopen,
logout/login, two concurrent chats, image and tool work, preference retrieval,
unread/failed indicators, then legacy fallback with the flag disabled.

## Rollback

Set `ALMA_DURABLE_CHAT_ENABLED=false`, redeploy Vercel, retain the migration,
queue data, and Edge Function, then verify `/api/chat/stream`. Do not drop
queue tables. After blockers are fixed, repeat controlled worker testing before
re-enabling durable mode.
