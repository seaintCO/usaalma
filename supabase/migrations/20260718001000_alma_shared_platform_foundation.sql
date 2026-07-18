begin;

create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'business',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspaces add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.workspaces add column if not exists name text;
alter table public.workspaces add column if not exists type text not null default 'business';
alter table public.workspaces add column if not exists created_at timestamptz not null default now();
alter table public.workspaces add column if not exists updated_at timestamptz not null default now();

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique(workspace_id, user_id)
);

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now()
);

create table if not exists public.action_approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  execution_id uuid references public.agent_executions(id) on delete set null,
  domain text not null default 'platform',
  action_key text not null,
  action_summary text not null,
  status text not null default 'proposed'
    check (status in ('proposed', 'awaiting_approval', 'approved', 'rejected', 'executing', 'completed', 'failed')),
  risk_level text not null default 'internal'
    check (risk_level in ('internal', 'external', 'protected')),
  approval_policy text not null default 'automatic'
    check (approval_policy in ('automatic', 'approval_required', 'always_protected')),
  requested_payload jsonb not null default '{}'::jsonb,
  approved_payload jsonb,
  result_payload jsonb,
  error_message text,
  proposed_at timestamptz not null default now(),
  requested_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  executing_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  rejected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.action_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  approval_id uuid references public.action_approvals(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  execution_id uuid references public.agent_executions(id) on delete set null,
  action_key text not null,
  event_type text not null,
  risk_level text not null default 'internal'
    check (risk_level in ('internal', 'external', 'protected')),
  payload_redacted jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workspaces_owner_id_idx on public.workspaces(owner_id);
create index if not exists workspace_members_user_id_idx on public.workspace_members(user_id);
create index if not exists workspace_members_workspace_id_idx on public.workspace_members(workspace_id);
create index if not exists workspace_invites_workspace_id_idx on public.workspace_invites(workspace_id);
create index if not exists action_approvals_user_status_idx on public.action_approvals(user_id, status, created_at desc);
create index if not exists action_approvals_workspace_idx on public.action_approvals(workspace_id, created_at desc);
create index if not exists action_audit_logs_user_created_idx on public.action_audit_logs(user_id, created_at desc);
create index if not exists action_audit_logs_approval_idx on public.action_audit_logs(approval_id);

create or replace function public.alma_assert_platform_workspace_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.workspace_id is null then
    return new;
  end if;

  if exists (
    select 1 from public.workspaces w
    where w.id = new.workspace_id and w.owner_id = new.user_id
  ) then
    return new;
  end if;

  if exists (
    select 1 from public.workspace_members m
    where m.workspace_id = new.workspace_id and m.user_id = new.user_id
  ) then
    return new;
  end if;

  raise exception 'Workspace does not belong to user.';
end;
$$;

drop trigger if exists action_approvals_workspace_ownership on public.action_approvals;
create trigger action_approvals_workspace_ownership
before insert or update on public.action_approvals
for each row execute function public.alma_assert_platform_workspace_ownership();

drop trigger if exists action_audit_logs_workspace_ownership on public.action_audit_logs;
create trigger action_audit_logs_workspace_ownership
before insert or update on public.action_audit_logs
for each row execute function public.alma_assert_platform_workspace_ownership();

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.alma_set_updated_at();

drop trigger if exists action_approvals_set_updated_at on public.action_approvals;
create trigger action_approvals_set_updated_at
before update on public.action_approvals
for each row execute function public.alma_set_updated_at();

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.action_approvals enable row level security;
alter table public.action_audit_logs enable row level security;

drop policy if exists "Users read owned or member workspaces" on public.workspaces;
create policy "Users read owned or member workspaces" on public.workspaces for select
using (
  auth.uid() = owner_id
  or exists (
    select 1 from public.workspace_members m
    where m.workspace_id = id and m.user_id = auth.uid()
  )
);

drop policy if exists "Users create own workspaces" on public.workspaces;
create policy "Users create own workspaces" on public.workspaces for insert
with check (auth.uid() = owner_id);

drop policy if exists "Owners update owned workspaces" on public.workspaces;
create policy "Owners update owned workspaces" on public.workspaces for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Users read own workspace memberships" on public.workspace_members;
create policy "Users read own workspace memberships" on public.workspace_members for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = auth.uid()
  )
);

drop policy if exists "Owners manage workspace memberships" on public.workspace_members;
create policy "Owners manage workspace memberships" on public.workspace_members for all
using (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = auth.uid()
  )
);

drop policy if exists "Owners manage workspace invites" on public.workspace_invites;
create policy "Owners manage workspace invites" on public.workspace_invites for all
using (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = auth.uid()
  )
);

drop policy if exists "Users manage own action approvals" on public.action_approvals;
create policy "Users manage own action approvals" on public.action_approvals for all
using (
  auth.uid() = user_id
  and (
    workspace_id is null
    or exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspace_id and m.user_id = auth.uid()
    )
  )
)
with check (
  auth.uid() = user_id
  and (
    workspace_id is null
    or exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspace_id and m.user_id = auth.uid()
    )
  )
);

drop policy if exists "Users read own action audit logs" on public.action_audit_logs;
create policy "Users read own action audit logs" on public.action_audit_logs for select
using (auth.uid() = user_id);

drop policy if exists "Users insert own action audit logs" on public.action_audit_logs;
create policy "Users insert own action audit logs" on public.action_audit_logs for insert
with check (
  auth.uid() = user_id
  and (
    workspace_id is null
    or exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspace_id and m.user_id = auth.uid()
    )
  )
);

commit;

