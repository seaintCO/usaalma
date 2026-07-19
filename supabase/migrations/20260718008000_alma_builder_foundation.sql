begin;

create extension if not exists pgcrypto;

create table if not exists public.builder_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  title text not null,
  slug text not null,
  original_prompt text not null,
  preferred_language text not null default 'en' check (preferred_language in ('en','es')),
  project_type text not null default 'custom_app' check (project_type in ('website','portal','internal_tool','booking','custom_app')),
  lifecycle_status text not null default 'draft' check (lifecycle_status in ('draft','provisioning','ready','building','validating','awaiting_approval','preview_ready','blocked','failed','archived')),
  provider_project_id text,
  provider_workspace_id text,
  provider_repository_id text,
  active_session_id uuid,
  latest_checkpoint_id uuid,
  preview_status text not null default 'not_available' check (preview_status in ('not_available','provisioning','ready','blocked','failed')),
  preview_url text,
  preview_host text,
  source_control_status text not null default 'not_configured' check (source_control_status in ('not_configured','pending_approval','connected','blocked','failed')),
  deployment_status text not null default 'not_configured' check (deployment_status in ('not_configured','pending_approval','deployed','blocked','failed')),
  last_error_code text,
  safe_error_summary text,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.builder_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.builder_projects(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested','blocked','provisioning','active','completed','failed','cancelled')),
  provider_session_id text,
  provider_job_id text,
  started_at timestamptz,
  completed_at timestamptz,
  last_error_code text,
  safe_error_summary text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'builder_projects_active_session_fk'
  ) then
    alter table public.builder_projects
      add constraint builder_projects_active_session_fk
      foreign key (active_session_id) references public.builder_sessions(id) on delete set null;
  end if;
end $$;

create table if not exists public.builder_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.builder_projects(id) on delete cascade,
  session_id uuid references public.builder_sessions(id) on delete set null,
  sequence bigint generated always as identity,
  event_type text not null check (event_type in ('project_created','project_updated','session_requested','provisioning_started','provider_blocked','build_started','command_started','command_completed','validation_started','validation_completed','checkpoint_created','approval_requested','preview_ready','build_failed','project_archived')),
  lifecycle_status text not null check (lifecycle_status in ('draft','provisioning','ready','building','validating','awaiting_approval','preview_ready','blocked','failed','archived')),
  summary text not null,
  provider_correlation_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.builder_checkpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.builder_projects(id) on delete cascade,
  session_id uuid references public.builder_sessions(id) on delete set null,
  checkpoint_label text not null,
  description text,
  source_reference text,
  status text not null default 'created' check (status in ('created','approved','restoring','restored','blocked','failed')),
  restore_requires_approval boolean not null default true,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'builder_projects_latest_checkpoint_fk'
  ) then
    alter table public.builder_projects
      add constraint builder_projects_latest_checkpoint_fk
      foreign key (latest_checkpoint_id) references public.builder_checkpoints(id) on delete set null;
  end if;
end $$;

create table if not exists public.builder_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.builder_projects(id) on delete cascade,
  session_id uuid references public.builder_sessions(id) on delete set null,
  checkpoint_id uuid references public.builder_checkpoints(id) on delete set null,
  artifact_type text not null default 'other' check (artifact_type in ('source_archive','preview_bundle','test_report','screenshot','log_excerpt','specification','other')),
  title text not null,
  storage_bucket text,
  storage_path text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  checksum_sha256 text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.builder_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.builder_projects(id) on delete cascade,
  session_id uuid references public.builder_sessions(id) on delete set null,
  idempotency_key text not null,
  job_type text not null check (job_type in ('provision_workspace','run_coding_agent','validate_project','publish_preview','deploy_project')),
  status text not null default 'queued' check (status in ('queued','blocked','running','succeeded','retryable_failed','permanent_failed','cancelled')),
  provider_job_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts > 0),
  last_error_code text,
  safe_error_summary text,
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, idempotency_key)
);

create unique index if not exists builder_projects_idempotency_idx on public.builder_projects(user_id, idempotency_key) where idempotency_key is not null;
create index if not exists builder_projects_user_updated_idx on public.builder_projects(user_id, updated_at desc);
create index if not exists builder_projects_workspace_updated_idx on public.builder_projects(workspace_id, updated_at desc);
create index if not exists builder_sessions_project_idx on public.builder_sessions(project_id, created_at desc);
create index if not exists builder_events_project_sequence_idx on public.builder_events(project_id, sequence);
create index if not exists builder_checkpoints_project_created_idx on public.builder_checkpoints(project_id, created_at desc);
create index if not exists builder_artifacts_project_created_idx on public.builder_artifacts(project_id, created_at desc);
create index if not exists builder_jobs_project_status_idx on public.builder_jobs(project_id, status, created_at desc);

create or replace function public.builder_user_has_workspace(input_workspace_id uuid, input_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select input_workspace_id is null
    or exists(select 1 from public.workspaces w where w.id = input_workspace_id and w.owner_id = input_user_id)
    or exists(select 1 from public.workspace_members m where m.workspace_id = input_workspace_id and m.user_id = input_user_id);
$$;

create or replace function public.assert_builder_ownership()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.builder_user_has_workspace(new.workspace_id, new.user_id) then
    raise exception 'Builder workspace must belong to user.' using errcode='42501';
  end if;

  if tg_table_name <> 'builder_projects'
    and not exists(select 1 from public.builder_projects p where p.id = new.project_id and p.user_id = new.user_id and coalesce(p.workspace_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(new.workspace_id, '00000000-0000-0000-0000-000000000000'::uuid)) then
    raise exception 'Builder child row must belong to project owner.' using errcode='42501';
  end if;

  if tg_table_name in ('builder_events','builder_checkpoints','builder_artifacts','builder_jobs')
    and new.session_id is not null
    and not exists(select 1 from public.builder_sessions s where s.id = new.session_id and s.project_id = new.project_id and s.user_id = new.user_id) then
    raise exception 'Builder session must belong to project owner.' using errcode='42501';
  end if;

  if tg_table_name = 'builder_artifacts'
    and new.checkpoint_id is not null
    and not exists(select 1 from public.builder_checkpoints c where c.id = new.checkpoint_id and c.project_id = new.project_id and c.user_id = new.user_id) then
    raise exception 'Builder checkpoint must belong to project owner.' using errcode='42501';
  end if;

  return new;
end;
$$;

drop trigger if exists builder_projects_updated_at on public.builder_projects;
create trigger builder_projects_updated_at before update on public.builder_projects for each row execute function public.alma_set_updated_at();
drop trigger if exists builder_sessions_updated_at on public.builder_sessions;
create trigger builder_sessions_updated_at before update on public.builder_sessions for each row execute function public.alma_set_updated_at();
drop trigger if exists builder_checkpoints_updated_at on public.builder_checkpoints;
create trigger builder_checkpoints_updated_at before update on public.builder_checkpoints for each row execute function public.alma_set_updated_at();
drop trigger if exists builder_artifacts_updated_at on public.builder_artifacts;
create trigger builder_artifacts_updated_at before update on public.builder_artifacts for each row execute function public.alma_set_updated_at();
drop trigger if exists builder_jobs_updated_at on public.builder_jobs;
create trigger builder_jobs_updated_at before update on public.builder_jobs for each row execute function public.alma_set_updated_at();

drop trigger if exists builder_projects_ownership on public.builder_projects;
create trigger builder_projects_ownership before insert or update on public.builder_projects for each row execute function public.assert_builder_ownership();
drop trigger if exists builder_sessions_ownership on public.builder_sessions;
create trigger builder_sessions_ownership before insert or update on public.builder_sessions for each row execute function public.assert_builder_ownership();
drop trigger if exists builder_events_ownership on public.builder_events;
create trigger builder_events_ownership before insert or update on public.builder_events for each row execute function public.assert_builder_ownership();
drop trigger if exists builder_checkpoints_ownership on public.builder_checkpoints;
create trigger builder_checkpoints_ownership before insert or update on public.builder_checkpoints for each row execute function public.assert_builder_ownership();
drop trigger if exists builder_artifacts_ownership on public.builder_artifacts;
create trigger builder_artifacts_ownership before insert or update on public.builder_artifacts for each row execute function public.assert_builder_ownership();
drop trigger if exists builder_jobs_ownership on public.builder_jobs;
create trigger builder_jobs_ownership before insert or update on public.builder_jobs for each row execute function public.assert_builder_ownership();

alter table public.builder_projects enable row level security;
alter table public.builder_sessions enable row level security;
alter table public.builder_events enable row level security;
alter table public.builder_checkpoints enable row level security;
alter table public.builder_artifacts enable row level security;
alter table public.builder_jobs enable row level security;

drop policy if exists "Users manage own builder projects" on public.builder_projects;
create policy "Users manage own builder projects" on public.builder_projects for all
using (auth.uid() = user_id and public.builder_user_has_workspace(workspace_id, auth.uid()))
with check (auth.uid() = user_id and public.builder_user_has_workspace(workspace_id, auth.uid()));

drop policy if exists "Users manage own builder sessions" on public.builder_sessions;
create policy "Users manage own builder sessions" on public.builder_sessions for all
using (auth.uid() = user_id and public.builder_user_has_workspace(workspace_id, auth.uid()))
with check (auth.uid() = user_id and public.builder_user_has_workspace(workspace_id, auth.uid()));

drop policy if exists "Users read own builder events" on public.builder_events;
create policy "Users read own builder events" on public.builder_events for select
using (auth.uid() = user_id and public.builder_user_has_workspace(workspace_id, auth.uid()));

drop policy if exists "Users insert own builder events" on public.builder_events;
create policy "Users insert own builder events" on public.builder_events for insert
with check (auth.uid() = user_id and public.builder_user_has_workspace(workspace_id, auth.uid()));

drop policy if exists "Users manage own builder checkpoints" on public.builder_checkpoints;
create policy "Users manage own builder checkpoints" on public.builder_checkpoints for all
using (auth.uid() = user_id and public.builder_user_has_workspace(workspace_id, auth.uid()))
with check (auth.uid() = user_id and public.builder_user_has_workspace(workspace_id, auth.uid()));

drop policy if exists "Users manage own builder artifacts" on public.builder_artifacts;
create policy "Users manage own builder artifacts" on public.builder_artifacts for all
using (auth.uid() = user_id and public.builder_user_has_workspace(workspace_id, auth.uid()))
with check (auth.uid() = user_id and public.builder_user_has_workspace(workspace_id, auth.uid()));

drop policy if exists "Users manage own builder jobs" on public.builder_jobs;
create policy "Users manage own builder jobs" on public.builder_jobs for all
using (auth.uid() = user_id and public.builder_user_has_workspace(workspace_id, auth.uid()))
with check (auth.uid() = user_id and public.builder_user_has_workspace(workspace_id, auth.uid()));

commit;
