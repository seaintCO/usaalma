begin;

create table if not exists public.app_navigation_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  module_id text not null check (module_id in (
    'tasks','notes','planner','documents','communications','translator','voice','workspaces',
    'office','crm','construction','invoicing','ai_receptionist','images','creative_studio',
    'launch_studio','trader','fitness','agent_builder','builder','automations'
  )),
  pinned boolean not null default true,
  display_order integer not null default 0 check (display_order >= 0 and display_order <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists app_navigation_preferences_personal_unique
  on public.app_navigation_preferences(user_id, module_id)
  where workspace_id is null;
create unique index if not exists app_navigation_preferences_workspace_unique
  on public.app_navigation_preferences(user_id, workspace_id, module_id)
  where workspace_id is not null;
create index if not exists app_navigation_preferences_order_idx
  on public.app_navigation_preferences(user_id, workspace_id, pinned, display_order, created_at);

drop trigger if exists app_navigation_preferences_set_updated_at on public.app_navigation_preferences;
create trigger app_navigation_preferences_set_updated_at
before update on public.app_navigation_preferences
for each row execute function public.alma_set_updated_at();

drop trigger if exists app_navigation_preferences_workspace_ownership on public.app_navigation_preferences;
create trigger app_navigation_preferences_workspace_ownership
before insert or update on public.app_navigation_preferences
for each row execute function public.alma_assert_platform_workspace_ownership();

alter table public.app_navigation_preferences enable row level security;

drop policy if exists "Users manage own app navigation preferences" on public.app_navigation_preferences;
create policy "Users manage own app navigation preferences"
on public.app_navigation_preferences for all
using (
  auth.uid() = user_id and (
    workspace_id is null
    or exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
    or exists (select 1 from public.workspace_members m where m.workspace_id = workspace_id and m.user_id = auth.uid())
  )
)
with check (
  auth.uid() = user_id and (
    workspace_id is null
    or exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
    or exists (select 1 from public.workspace_members m where m.workspace_id = workspace_id and m.user_id = auth.uid())
  )
);

commit;

-- Rollback: drop table public.app_navigation_preferences cascade;
