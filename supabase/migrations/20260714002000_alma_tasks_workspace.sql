-- Stage A2: canonical user-facing tasks. Do not apply automatically.
begin;

alter table public.tasks add column if not exists description text;
alter table public.tasks add column if not exists priority text not null default 'medium';
alter table public.tasks add column if not exists status text;
alter table public.tasks add column if not exists due_at timestamptz;
alter table public.tasks add column if not exists completed_at timestamptz;
alter table public.tasks add column if not exists source text not null default 'manual';
alter table public.tasks add column if not exists source_execution_id uuid references public.agent_executions(id) on delete set null;
alter table public.tasks add column if not exists updated_at timestamptz not null default now();
update public.tasks set status = case when completed then 'completed' else 'open' end where status is null;
alter table public.tasks alter column status set default 'open';
alter table public.tasks alter column status set not null;
alter table public.tasks drop constraint if exists tasks_priority_check;
alter table public.tasks add constraint tasks_priority_check check (priority in ('low','medium','high','urgent'));
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check check (status in ('open','in_progress','completed','cancelled'));
alter table public.tasks drop constraint if exists tasks_source_check;
alter table public.tasks add constraint tasks_source_check check (source in ('manual','alma_chat','planner','import'));
create index if not exists tasks_user_status_due_idx on public.tasks(user_id, status, due_at);
create index if not exists tasks_user_created_idx on public.tasks(user_id, created_at desc);
create unique index if not exists tasks_alma_execution_idx on public.tasks(user_id, source_execution_id) where source='alma_chat' and source_execution_id is not null;

create or replace function public.set_tasks_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists tasks_updated_at on public.tasks;
drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at before update on public.tasks for each row execute function public.set_tasks_updated_at();

alter table public.tasks enable row level security;
drop policy if exists "Users manage own tasks" on public.tasks;
drop policy if exists "Users read own tasks" on public.tasks;
drop policy if exists "Users insert own tasks" on public.tasks;
drop policy if exists "Users update own tasks" on public.tasks;
drop policy if exists "Users delete own tasks" on public.tasks;
create policy "Users read own tasks" on public.tasks for select to authenticated using (user_id=auth.uid());
create policy "Users insert own tasks" on public.tasks for insert to authenticated with check (user_id=auth.uid());
create policy "Users update own tasks" on public.tasks for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "Users delete own tasks" on public.tasks for delete to authenticated using (user_id=auth.uid());
commit;
-- Deterministic migration version: 20260714002000.
