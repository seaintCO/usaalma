begin;

create table if not exists public.workspace_language_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  preferred_language text not null default 'en' check (preferred_language in ('en','es')),
  translation_language text not null default 'es' check (translation_language in ('en','es')),
  auto_translate_inbound boolean not null default true,
  auto_suggest_replies boolean not null default false,
  store_transcripts boolean not null default false,
  professional_tone text not null default 'professional',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, workspace_id)
);

create table if not exists public.communication_glossary_terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  source_language text not null default 'en' check (source_language in ('en','es')),
  target_language text not null default 'es' check (target_language in ('en','es')),
  source_term text not null,
  target_term text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, workspace_id, source_language, target_language, source_term)
);

create table if not exists public.communication_translation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  operation text not null check (operation in (
    'detect_language',
    'correct_grammar',
    'translate_text',
    'correct_and_translate',
    'rewrite_for_tone',
    'shorten_for_channel',
    'generate_bilingual_reply',
    'summarize_conversation',
    'prepare_external_message'
  )),
  source_language text not null check (source_language in ('en','es')),
  target_language text not null check (target_language in ('en','es')),
  tone text not null default 'professional' check (tone in ('professional','friendly','direct','formal')),
  channel text not null default 'chat',
  original_text text not null,
  corrected_text text,
  translated_text text,
  warnings text[] not null default '{}',
  provider text not null default 'local_fallback',
  status text not null default 'completed' check (status in ('completed','failed','blocked')),
  created_at timestamptz not null default now()
);

create index if not exists workspace_language_preferences_workspace_idx on public.workspace_language_preferences(user_id, workspace_id);
create index if not exists communication_glossary_terms_workspace_idx on public.communication_glossary_terms(user_id, workspace_id, active);
create index if not exists communication_translation_jobs_workspace_idx on public.communication_translation_jobs(user_id, workspace_id, created_at desc);

drop trigger if exists workspace_language_preferences_updated_at on public.workspace_language_preferences;
create trigger workspace_language_preferences_updated_at before update on public.workspace_language_preferences for each row execute function public.alma_set_updated_at();
drop trigger if exists communication_glossary_terms_updated_at on public.communication_glossary_terms;
create trigger communication_glossary_terms_updated_at before update on public.communication_glossary_terms for each row execute function public.alma_set_updated_at();

alter table public.workspace_language_preferences enable row level security;
alter table public.communication_glossary_terms enable row level security;
alter table public.communication_translation_jobs enable row level security;

drop policy if exists "Users manage own language preferences" on public.workspace_language_preferences;
create policy "Users manage own language preferences" on public.workspace_language_preferences for all
using (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()))
with check (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()));

drop policy if exists "Users manage own glossary terms" on public.communication_glossary_terms;
create policy "Users manage own glossary terms" on public.communication_glossary_terms for all
using (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()))
with check (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()));

drop policy if exists "Users read own translation jobs" on public.communication_translation_jobs;
create policy "Users read own translation jobs" on public.communication_translation_jobs for select
using (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()));

grant select, insert, update, delete on table public.workspace_language_preferences to authenticated;
grant select, insert, update, delete on table public.communication_glossary_terms to authenticated;
grant select on table public.communication_translation_jobs to authenticated;
grant all on table public.communication_translation_jobs to service_role;

commit;
