begin;

create table if not exists public.workspace_voice_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  selected_voice text not null default 'alloy',
  preferred_language text not null default 'auto' check (preferred_language in ('auto','en','es')),
  speaking_speed numeric not null default 1.0 check (speaking_speed between 0.5 and 1.5),
  professional_tone text not null default 'professional',
  verbosity text not null default 'balanced' check (verbosity in ('brief','balanced','detailed')),
  auto_play boolean not null default true,
  store_transcripts boolean not null default false,
  automatic_business_memory boolean not null default false,
  retention_days integer not null default 180 check (retention_days between 1 and 3650),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, workspace_id)
);

create table if not exists public.voice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  mode text not null check (mode in ('alma_voice','translator')),
  model text not null,
  preferred_language text not null default 'auto',
  status text not null default 'active' check (status in ('active','completed','failed','cancelled')),
  summary text,
  decisions jsonb not null default '[]'::jsonb,
  tasks jsonb not null default '[]'::jsonb,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.voice_transcripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  session_id uuid references public.voice_sessions(id) on delete set null,
  source text not null check (source in ('translator','alma_voice')),
  transcript text not null,
  translation text,
  source_language text,
  target_language text,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_memory_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  session_id uuid references public.voice_sessions(id) on delete set null,
  source text not null default 'voice',
  summary text not null,
  memory_key text not null,
  memory_value text not null,
  provenance jsonb not null default '{}'::jsonb,
  status text not null default 'proposed' check (status in ('proposed','approved','rejected','forgotten')),
  sensitive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_voice_preferences_workspace_idx on public.workspace_voice_preferences(user_id, workspace_id);
create index if not exists voice_sessions_workspace_idx on public.voice_sessions(user_id, workspace_id, created_at desc);
create index if not exists voice_transcripts_session_idx on public.voice_transcripts(user_id, session_id, created_at);
create index if not exists conversation_memory_candidates_user_idx on public.conversation_memory_candidates(user_id, workspace_id, status, created_at desc);

drop trigger if exists workspace_voice_preferences_updated_at on public.workspace_voice_preferences;
create trigger workspace_voice_preferences_updated_at before update on public.workspace_voice_preferences for each row execute function public.alma_set_updated_at();
drop trigger if exists voice_sessions_updated_at on public.voice_sessions;
create trigger voice_sessions_updated_at before update on public.voice_sessions for each row execute function public.alma_set_updated_at();
drop trigger if exists conversation_memory_candidates_updated_at on public.conversation_memory_candidates;
create trigger conversation_memory_candidates_updated_at before update on public.conversation_memory_candidates for each row execute function public.alma_set_updated_at();

alter table public.workspace_voice_preferences enable row level security;
alter table public.voice_sessions enable row level security;
alter table public.voice_transcripts enable row level security;
alter table public.conversation_memory_candidates enable row level security;

drop policy if exists "Users manage own voice preferences" on public.workspace_voice_preferences;
create policy "Users manage own voice preferences" on public.workspace_voice_preferences for all
using (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()))
with check (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()));

drop policy if exists "Users read own voice sessions" on public.voice_sessions;
create policy "Users read own voice sessions" on public.voice_sessions for select
using (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()));

drop policy if exists "Users read own voice transcripts" on public.voice_transcripts;
create policy "Users read own voice transcripts" on public.voice_transcripts for select
using (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()));

drop policy if exists "Users manage own memory candidates" on public.conversation_memory_candidates;
create policy "Users manage own memory candidates" on public.conversation_memory_candidates for all
using (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()))
with check (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()));

grant select, insert, update on table public.workspace_voice_preferences to authenticated;
grant select on table public.voice_sessions to authenticated;
grant select on table public.voice_transcripts to authenticated;
grant select, update on table public.conversation_memory_candidates to authenticated;
grant all on table public.voice_sessions to service_role;
grant all on table public.voice_transcripts to service_role;
grant all on table public.conversation_memory_candidates to service_role;

commit;
