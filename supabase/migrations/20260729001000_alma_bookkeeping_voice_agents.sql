begin;

-- Complete payroll preparation without pretending to process payroll.
create table if not exists public.business_payroll_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  period_id uuid not null references public.business_payroll_periods(id) on delete cascade,
  person_id uuid not null references public.business_payroll_people(id) on delete cascade,
  regular_hours numeric(10,2) not null default 0 check (regular_hours >= 0),
  overtime_hours numeric(10,2) not null default 0 check (overtime_hours >= 0),
  reimbursements numeric(14,2) not null default 0 check (reimbursements >= 0),
  bonuses numeric(14,2) not null default 0 check (bonuses >= 0),
  calculated_gross_pay numeric(14,2) not null default 0 check (calculated_gross_pay >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_id, person_id)
);

create index if not exists business_payroll_entries_scope_idx
  on public.business_payroll_entries(workspace_id, user_id, period_id);

-- ElevenLabs and Twilio are BYOK operational connectors. Secrets remain in the
-- existing server-only encrypted connector secret table.
alter table public.provider_connections
  drop constraint if exists provider_connections_provider_check;
alter table public.provider_connections
  add constraint provider_connections_provider_check
  check (provider in (
    'gmail','outlook','quickbooks','stripe_connect','whatsapp_business',
    'github_app','elevenlabs','twilio'
  ));

alter table public.provider_connection_secrets
  drop constraint if exists provider_connection_secrets_provider_check;
alter table public.provider_connection_secrets
  add constraint provider_connection_secrets_provider_check
  check (provider in (
    'gmail','outlook','quickbooks','stripe_connect','whatsapp_business',
    'github_app','elevenlabs','twilio'
  ));

create table if not exists public.voice_agent_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  connection_id uuid not null references public.provider_connections(id) on delete restrict,
  external_agent_id text not null,
  name text not null,
  agent_type text not null default 'receptionist'
    check (agent_type in ('receptionist','assistant','transcriber')),
  status text not null default 'active'
    check (status in ('draft','provisioning','active','paused','error')),
  language text not null default 'en'
    check (language in ('en','es','bilingual')),
  greeting text not null,
  system_prompt text not null,
  voice_id text,
  disclosure_text text not null default
    'This call may be handled and transcribed by an AI assistant.',
  phone_number text,
  human_transfer_phone text,
  recording_enabled boolean not null default false,
  auto_create_leads boolean not null default true,
  provider_metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (external_agent_id)
);

create index if not exists voice_agent_profiles_scope_idx
  on public.voice_agent_profiles(workspace_id, user_id, created_at desc);

create table if not exists public.voice_call_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  agent_profile_id uuid not null references public.voice_agent_profiles(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  provider_conversation_id text not null,
  direction text not null default 'unknown'
    check (direction in ('inbound','outbound','browser','unknown')),
  caller_phone text,
  called_phone text,
  status text not null default 'completed'
    check (status in ('initiated','connected','completed','failed','missed')),
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  transcript jsonb not null default '[]'::jsonb,
  transcript_text text,
  summary text,
  outcome text,
  sentiment text,
  recording_available boolean not null default false,
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_conversation_id)
);

create index if not exists voice_call_records_scope_created_idx
  on public.voice_call_records(workspace_id, user_id, created_at desc);
create index if not exists voice_call_records_contact_idx
  on public.voice_call_records(contact_id, created_at desc);

create table if not exists public.voice_webhook_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  agent_profile_id uuid not null references public.voice_agent_profiles(id) on delete cascade,
  provider_event_id text not null unique,
  event_type text not null,
  provider_conversation_id text,
  status text not null default 'processed'
    check (status in ('received','processed','failed','ignored')),
  safe_error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.business_payroll_entries enable row level security;
drop policy if exists "ALMA business office scoped access" on public.business_payroll_entries;
create policy "ALMA business office scoped access"
on public.business_payroll_entries
for all to authenticated
using (
  (workspace_id is null and user_id = auth.uid())
  or (workspace_id is not null and public.alma_business_workspace_access(workspace_id))
)
with check (
  user_id = auth.uid()
  and (workspace_id is null or public.alma_business_workspace_access(workspace_id))
);

drop trigger if exists business_payroll_entries_updated_at
  on public.business_payroll_entries;
create trigger business_payroll_entries_updated_at
before update on public.business_payroll_entries
for each row execute function public.alma_business_set_updated_at();

alter table public.voice_agent_profiles enable row level security;
alter table public.voice_call_records enable row level security;
alter table public.voice_webhook_events enable row level security;

drop policy if exists "Users manage workspace voice agents" on public.voice_agent_profiles;
create policy "Users manage workspace voice agents"
on public.voice_agent_profiles
for all to authenticated
using (
  user_id = auth.uid()
  and public.alma_business_workspace_access(workspace_id)
)
with check (
  user_id = auth.uid()
  and public.alma_business_workspace_access(workspace_id)
);

drop policy if exists "Users read workspace voice calls" on public.voice_call_records;
create policy "Users read workspace voice calls"
on public.voice_call_records
for select to authenticated
using (
  user_id = auth.uid()
  and public.alma_business_workspace_access(workspace_id)
);

-- Calls are written by the signed webhook service. Users may add notes or a
-- contact relationship later, but cannot fabricate provider call records.
revoke insert, delete on public.voice_call_records from authenticated;
revoke all on public.voice_webhook_events from anon, authenticated;

drop trigger if exists voice_agent_profiles_updated_at on public.voice_agent_profiles;
create trigger voice_agent_profiles_updated_at
before update on public.voice_agent_profiles
for each row execute function public.alma_business_set_updated_at();

drop trigger if exists voice_call_records_updated_at on public.voice_call_records;
create trigger voice_call_records_updated_at
before update on public.voice_call_records
for each row execute function public.alma_business_set_updated_at();

commit;
