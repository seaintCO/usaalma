begin;

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('auth.users') is null then
    raise exception 'Phase 1 agent foundation requires auth.users.';
  end if;

  if to_regclass('public.conversations') is null then
    raise exception 'Phase 1 agent foundation requires public.conversations. Apply the ALMA core schema before this migration.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversations' and column_name = 'id' and data_type = 'uuid'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversations' and column_name = 'user_id'
  ) then
    raise exception 'Phase 1 agent foundation requires public.conversations(id uuid, user_id).';
  end if;
end $$;

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid,
  name text not null,
  slug text not null default 'alma',
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  personality text not null default '',
  system_instructions text not null default '',
  language_mode text not null default 'auto' check (language_mode in ('en', 'es', 'auto')),
  elevenlabs_voice_id text,
  autonomy_level text not null default 'supervised' check (autonomy_level in ('manual', 'supervised', 'trusted')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, slug)
);

create table if not exists public.agent_memories (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'general',
  memory_key text not null,
  memory_value text not null,
  importance integer not null default 5 check (importance between 1 and 10),
  source text not null default 'user',
  confidence numeric(3,2) not null default 1 check (confidence between 0 and 1),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(agent_id, memory_key)
);

create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  instructions text not null default '',
  status text not null default 'active' check (status in ('draft', 'active', 'paused', 'completed', 'failed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  schedule_type text not null default 'manual' check (schedule_type in ('manual', 'once', 'recurring')),
  schedule_expression text,
  next_run_at timestamptz,
  last_run_at timestamptz,
  failure_count integer not null default 0,
  retry_after timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_executions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  task_id uuid references public.agent_tasks(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  trigger_type text not null check (trigger_type in ('chat', 'manual', 'scheduled', 'event')),
  intent text,
  status text not null default 'running' check (status in ('pending', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled')),
  goal text,
  plan jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_execution_steps (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references public.agent_executions(id) on delete cascade,
  sequence integer not null constraint agent_execution_steps_sequence_positive check (sequence > 0),
  kind text not null check (kind in ('plan', 'tool', 'approval', 'verification', 'reflection')),
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'skipped')),
  tool_name text,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  attempt integer not null default 1 constraint agent_execution_steps_attempt_positive check (attempt > 0),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(execution_id, sequence)
);

create table if not exists public.agent_approvals (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  execution_id uuid not null references public.agent_executions(id) on delete cascade,
  execution_step_id uuid references public.agent_execution_steps(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired')),
  action_summary text not null,
  tool_name text,
  arguments_redacted jsonb not null default '{}'::jsonb,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz
);

create table if not exists public.agent_permissions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid,
  tool_name text,
  resource_scope text,
  action text not null,
  effect text not null check (effect in ('allow', 'deny', 'require_approval')),
  conditions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_activity_logs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  execution_id uuid references public.agent_executions(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  level text not null default 'info' check (level in ('info', 'success', 'warning', 'error')),
  event_type text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.agent_execution_steps'::regclass
      and conname = 'agent_execution_steps_sequence_positive'
  ) then
    alter table public.agent_execution_steps
      add constraint agent_execution_steps_sequence_positive check (sequence > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.agent_execution_steps'::regclass
      and conname = 'agent_execution_steps_attempt_positive'
  ) then
    alter table public.agent_execution_steps
      add constraint agent_execution_steps_attempt_positive check (attempt > 0);
  end if;
end $$;

create index if not exists agents_user_id_idx on public.agents(user_id);
create index if not exists agent_memories_agent_id_idx on public.agent_memories(agent_id, importance desc);
create index if not exists agent_tasks_due_idx on public.agent_tasks(status, next_run_at);
create index if not exists agent_executions_agent_id_idx on public.agent_executions(agent_id, created_at desc);
create index if not exists agent_execution_steps_execution_id_idx on public.agent_execution_steps(execution_id, sequence);
create index if not exists agent_activity_logs_agent_id_idx on public.agent_activity_logs(agent_id, created_at desc);

create or replace function public.alma_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists agents_set_updated_at on public.agents;
create trigger agents_set_updated_at before update on public.agents for each row execute function public.alma_set_updated_at();
drop trigger if exists agent_memories_set_updated_at on public.agent_memories;
create trigger agent_memories_set_updated_at before update on public.agent_memories for each row execute function public.alma_set_updated_at();
drop trigger if exists agent_tasks_set_updated_at on public.agent_tasks;
create trigger agent_tasks_set_updated_at before update on public.agent_tasks for each row execute function public.alma_set_updated_at();
drop trigger if exists agent_permissions_set_updated_at on public.agent_permissions;
create trigger agent_permissions_set_updated_at before update on public.agent_permissions for each row execute function public.alma_set_updated_at();

alter table public.agents enable row level security;
alter table public.agent_memories enable row level security;
alter table public.agent_tasks enable row level security;
alter table public.agent_executions enable row level security;
alter table public.agent_execution_steps enable row level security;
alter table public.agent_approvals enable row level security;
alter table public.agent_permissions enable row level security;
alter table public.agent_activity_logs enable row level security;

drop policy if exists "Users manage own agents" on public.agents;
drop policy if exists "Users manage own agent memories" on public.agent_memories;
drop policy if exists "Users manage own agent tasks" on public.agent_tasks;
drop policy if exists "Users manage own agent executions" on public.agent_executions;
drop policy if exists "Users manage own agent execution steps" on public.agent_execution_steps;
drop policy if exists "Users manage own agent approvals" on public.agent_approvals;
drop policy if exists "Users manage own agent permissions" on public.agent_permissions;
drop policy if exists "Users manage own agent activity logs" on public.agent_activity_logs;

create policy "Users manage own agents" on public.agents for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage own agent memories" on public.agent_memories for all
using (
  auth.uid() = user_id
  and exists (select 1 from public.agents a where a.id = agent_id and a.user_id = auth.uid())
)
with check (
  auth.uid() = user_id
  and exists (select 1 from public.agents a where a.id = agent_id and a.user_id = auth.uid())
);

create policy "Users manage own agent tasks" on public.agent_tasks for all
using (
  auth.uid() = user_id
  and exists (select 1 from public.agents a where a.id = agent_id and a.user_id = auth.uid())
)
with check (
  auth.uid() = user_id
  and exists (select 1 from public.agents a where a.id = agent_id and a.user_id = auth.uid())
);

create policy "Users manage own agent executions" on public.agent_executions for all
using (
  auth.uid() = user_id
  and exists (select 1 from public.agents a where a.id = agent_id and a.user_id = auth.uid())
  and (conversation_id is null or exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()))
)
with check (
  auth.uid() = user_id
  and exists (select 1 from public.agents a where a.id = agent_id and a.user_id = auth.uid())
  and (conversation_id is null or exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()))
);

create policy "Users manage own agent execution steps" on public.agent_execution_steps for all
using (
  exists (
    select 1 from public.agent_executions e
    join public.agents a on a.id = e.agent_id
    where e.id = execution_id and e.user_id = auth.uid() and a.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.agent_executions e
    join public.agents a on a.id = e.agent_id
    where e.id = execution_id and e.user_id = auth.uid() and a.user_id = auth.uid()
  )
);

create policy "Users manage own agent approvals" on public.agent_approvals for all
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.agent_executions e
    join public.agents a on a.id = e.agent_id
    where e.id = execution_id and e.agent_id = agent_id and e.user_id = auth.uid() and a.user_id = auth.uid()
  )
  and (execution_step_id is null or exists (select 1 from public.agent_execution_steps s where s.id = execution_step_id and s.execution_id = execution_id))
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.agent_executions e
    join public.agents a on a.id = e.agent_id
    where e.id = execution_id and e.agent_id = agent_id and e.user_id = auth.uid() and a.user_id = auth.uid()
  )
  and (execution_step_id is null or exists (select 1 from public.agent_execution_steps s where s.id = execution_step_id and s.execution_id = execution_id))
);

create policy "Users manage own agent permissions" on public.agent_permissions for all
using (
  auth.uid() = user_id
  and exists (select 1 from public.agents a where a.id = agent_id and a.user_id = auth.uid())
)
with check (
  auth.uid() = user_id
  and exists (select 1 from public.agents a where a.id = agent_id and a.user_id = auth.uid())
);

create policy "Users manage own agent activity logs" on public.agent_activity_logs for all
using (
  auth.uid() = user_id
  and exists (select 1 from public.agents a where a.id = agent_id and a.user_id = auth.uid())
  and (execution_id is null or exists (select 1 from public.agent_executions e where e.id = execution_id and e.agent_id = agent_id and e.user_id = auth.uid()))
)
with check (
  auth.uid() = user_id
  and exists (select 1 from public.agents a where a.id = agent_id and a.user_id = auth.uid())
  and (execution_id is null or exists (select 1 from public.agent_executions e where e.id = execution_id and e.agent_id = agent_id and e.user_id = auth.uid()))
);

commit;
-- Deterministic migration version: 20260713000000.
