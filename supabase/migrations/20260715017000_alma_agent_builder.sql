-- Agent Builder V1 foundation. Additive and safe to rerun; do not apply automatically.
begin;

alter table public.agents add column if not exists role text not null default 'Assistant';
alter table public.agents add column if not exists description text not null default '';
alter table public.agents add column if not exists approval_mode text not null default 'ask_for_sensitive';
alter table public.agents add column if not exists memory_enabled boolean not null default true;
alter table public.agents add column if not exists voice_enabled boolean not null default false;
alter table public.agents add column if not exists voice_provider text;
alter table public.agents add column if not exists voice_id text;
alter table public.agents add column if not exists duplicate_source_agent_id uuid references public.agents(id) on delete set null;
alter table public.agents add column if not exists duplicate_idempotency_key text;

alter table public.agents drop constraint if exists agents_status_check;
alter table public.agents add constraint agents_status_check check (status in ('draft','active','paused','archived'));
alter table public.agents drop constraint if exists agents_approval_mode_check;
alter table public.agents add constraint agents_approval_mode_check check (approval_mode in ('always_ask','ask_for_sensitive','trusted_tools_only'));
alter table public.agents drop constraint if exists agents_voice_provider_check;
alter table public.agents add constraint agents_voice_provider_check check (voice_provider is null or voice_provider in ('elevenlabs'));

create unique index if not exists agents_duplicate_idempotency_idx
  on public.agents(user_id, duplicate_idempotency_key)
  where duplicate_idempotency_key is not null;

create unique index if not exists agent_permissions_tool_unique_idx
  on public.agent_permissions(agent_id, tool_name, action)
  where tool_name is not null;

create table if not exists public.agent_connection_assignments (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.oauth_connections(id) on delete cascade,
  provider text not null check (provider in ('google_workspace','stripe')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(agent_id, connection_id)
);

create index if not exists agent_connection_assignments_agent_idx
  on public.agent_connection_assignments(agent_id, provider);

create or replace function public.assert_agent_builder_connection_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.agents a where a.id = new.agent_id and a.user_id = new.user_id) then
    raise exception 'agent connection assignment must belong to owned agent' using errcode = '42501';
  end if;
  if not exists (
    select 1
    from public.oauth_connections c
    where c.id = new.connection_id
      and c.user_id = new.user_id
      and c.provider = new.provider
      and c.connected = true
      and c.connection_status = 'connected'
  ) then
    raise exception 'agent connection assignment requires an owned verified connection' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists assert_agent_builder_connection_assignment on public.agent_connection_assignments;
create trigger assert_agent_builder_connection_assignment
before insert or update on public.agent_connection_assignments
for each row execute function public.assert_agent_builder_connection_assignment();

drop trigger if exists agent_connection_assignments_set_updated_at on public.agent_connection_assignments;
create trigger agent_connection_assignments_set_updated_at
before update on public.agent_connection_assignments
for each row execute function public.alma_set_updated_at();

alter table public.agent_connection_assignments enable row level security;

drop policy if exists "Users manage own agent connection assignments" on public.agent_connection_assignments;
create policy "Users manage own agent connection assignments" on public.agent_connection_assignments for all
using (
  auth.uid() = user_id
  and exists (select 1 from public.agents a where a.id = agent_id and a.user_id = auth.uid())
)
with check (
  auth.uid() = user_id
  and exists (select 1 from public.agents a where a.id = agent_id and a.user_id = auth.uid())
  and exists (
    select 1 from public.oauth_connections c
    where c.id = connection_id
      and c.user_id = auth.uid()
      and c.provider = provider
      and c.connected = true
      and c.connection_status = 'connected'
  )
);

revoke all on function public.assert_agent_builder_connection_assignment() from public, anon, authenticated;

commit;
