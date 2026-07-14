-- Stage 7 durable chat queue. Additive and safe to rerun; do not apply automatically.
begin;

alter table public.agent_executions add column if not exists idempotency_key text;
alter table public.agent_executions add column if not exists user_message_id uuid;
alter table public.agent_executions add column if not exists queued_at timestamptz;
alter table public.agent_executions add column if not exists claim_token uuid;
alter table public.agent_executions add column if not exists lease_expires_at timestamptz;
alter table public.agent_executions drop constraint if exists agent_executions_status_check;
alter table public.agent_executions add constraint agent_executions_status_check check (status in ('pending','queued','running','completed','failed','cancelled','waiting_approval'));
create unique index if not exists agent_executions_durable_idempotency_idx on public.agent_executions(user_id, agent_id, idempotency_key) where idempotency_key is not null;

alter table public.messages add column if not exists execution_id uuid references public.agent_executions(id) on delete set null;
alter table public.messages add column if not exists status text not null default 'final' check (status in ('draft','streaming','final','failed'));
alter table public.messages add column if not exists idempotency_key text;
alter table public.messages add column if not exists updated_at timestamptz not null default now();
create unique index if not exists messages_one_assistant_per_execution_idx on public.messages(execution_id) where execution_id is not null and role = 'assistant';
create unique index if not exists messages_user_idempotency_idx on public.messages(conversation_id, idempotency_key) where idempotency_key is not null;

alter table public.agent_execution_steps add column if not exists step_key text;
create unique index if not exists agent_execution_steps_step_key_idx on public.agent_execution_steps(execution_id, step_key) where step_key is not null;

alter table public.tool_runs add column if not exists execution_id uuid references public.agent_executions(id) on delete set null;
alter table public.tool_runs add column if not exists step_key text;
alter table public.tool_runs add column if not exists idempotency_key text;
create unique index if not exists tool_runs_durable_idempotency_idx on public.tool_runs(execution_id, step_key) where execution_id is not null and step_key is not null;

alter table public.conversations add column if not exists last_message_at timestamptz;
alter table public.conversations add column if not exists updated_at timestamptz not null default now();
create table if not exists public.conversation_user_state (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.chat_runs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade, conversation_id uuid not null references public.conversations(id) on delete cascade,
  execution_id uuid not null unique references public.agent_executions(id) on delete cascade, user_message_id uuid not null references public.messages(id) on delete restrict,
  idempotency_key text not null, status text not null default 'queued' check (status in ('queued','running','retryable','completed','failed','cancelled')),
  attempts integer not null default 0 check (attempts >= 0), max_attempts integer not null default 3 check (max_attempts > 0), available_at timestamptz not null default now(),
  claimed_at timestamptz, claim_token uuid, lease_expires_at timestamptz, last_error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id, agent_id, idempotency_key)
);
create index if not exists chat_runs_claim_idx on public.chat_runs(status, available_at) where status in ('queued','retryable','running');

create or replace function public.claim_chat_run(p_lease_seconds integer default 300)
returns public.chat_runs language plpgsql security definer set search_path = public as $$
declare v_run public.chat_runs; begin
  select * into v_run from public.chat_runs
   where (status in ('queued','retryable') and available_at <= now()) or (status='running' and lease_expires_at < now())
   order by available_at, created_at for update skip locked limit 1;
  if v_run.id is null then return null; end if;
  update public.chat_runs set status='running', attempts=attempts+1, claimed_at=now(), claim_token=gen_random_uuid(), lease_expires_at=now()+make_interval(secs => p_lease_seconds), updated_at=now()
   where id=v_run.id returning * into v_run;
  update public.agent_executions set status='running', claim_token=v_run.claim_token, lease_expires_at=v_run.lease_expires_at where id=v_run.execution_id and status in ('pending','queued','running');
  return v_run; end $$;

create or replace function public.complete_chat_run(p_id uuid, p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$ begin
  update public.chat_runs set status='completed', lease_expires_at=null, updated_at=now() where id=p_id and claim_token=p_token and status='running'; return found; end $$;
create or replace function public.fail_chat_run(p_id uuid, p_token uuid, p_error text, p_retry boolean default true)
returns boolean language plpgsql security definer set search_path = public as $$ begin
  update public.chat_runs set status=case when p_retry and attempts < max_attempts then 'retryable' else 'failed' end, last_error=p_error, available_at=now()+interval '30 seconds', claim_token=null, lease_expires_at=null, updated_at=now() where id=p_id and claim_token=p_token and status='running'; return found; end $$;

alter table public.chat_runs enable row level security;
alter table public.conversation_user_state enable row level security;
drop policy if exists "Users read own chat runs" on public.chat_runs;
create policy "Users read own chat runs" on public.chat_runs for select to authenticated using (user_id=auth.uid());
drop policy if exists "Users manage own conversation state" on public.conversation_user_state;
create policy "Users manage own conversation state" on public.conversation_user_state for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
commit;
