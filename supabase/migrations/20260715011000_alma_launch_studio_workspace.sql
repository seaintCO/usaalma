-- ALMA Launch Studio workspace. Additive; do not apply automatically.
begin;
alter table public.launch_studio_projects add column if not exists launch_data jsonb not null default '{}'::jsonb;
alter table public.launch_studio_projects add column if not exists archived_at timestamptz;
alter table public.launch_studio_projects add column if not exists duplicated_from_id uuid references public.launch_studio_projects(id) on delete set null;
alter table public.launch_studio_projects add column if not exists updated_at timestamptz not null default now();
create index if not exists launch_studio_projects_user_active_idx on public.launch_studio_projects(user_id,updated_at desc) where archived_at is null;
create or replace function public.set_launch_studio_updated_at() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists launch_studio_projects_updated_at on public.launch_studio_projects;
create trigger launch_studio_projects_updated_at before update on public.launch_studio_projects for each row execute function public.set_launch_studio_updated_at();
alter table public.launch_studio_projects enable row level security;
drop policy if exists "Users manage own launch studio projects" on public.launch_studio_projects;
create policy "Users manage own launch studio projects" on public.launch_studio_projects for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
commit;
