begin;

create table if not exists public.communication_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  channel text not null check (channel in ('email','whatsapp')),
  provider text not null,
  provider_thread_id text,
  customer_contact_id uuid references public.contacts(id) on delete set null,
  customer_display_name text,
  contact_address text not null,
  detected_language text,
  preferred_language text,
  unread_count integer not null default 0,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  last_activity_at timestamptz not null default now(),
  delivery_state text not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, channel, contact_address)
);

create table if not exists public.communication_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  thread_id uuid not null references public.communication_threads(id) on delete cascade,
  channel text not null check (channel in ('email','whatsapp')),
  direction text not null check (direction in ('inbound','outbound')),
  provider_message_id text,
  provider_status text,
  message_type text not null default 'text',
  original_text text,
  translated_text text,
  detected_language text,
  media_metadata jsonb not null default '{}'::jsonb,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(workspace_id, channel, provider_message_id)
);

create table if not exists public.communication_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  thread_id uuid references public.communication_threads(id) on delete cascade,
  channel text not null check (channel in ('email','whatsapp')),
  original_text text not null,
  corrected_text text,
  translated_text text,
  target_language text,
  status text not null default 'draft' check (status in ('draft','awaiting_approval','sent','blocked','cancelled')),
  approval_id uuid references public.action_approvals(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  connection_id uuid references public.provider_connections(id) on delete cascade,
  template_name text not null,
  language_code text not null,
  category text,
  status text not null default 'unknown',
  components jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, template_name, language_code)
);

create table if not exists public.whatsapp_opt_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_address text not null,
  consent_status text not null default 'unknown' check (consent_status in ('unknown','opted_in','opted_out')),
  source text,
  updated_by_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, contact_address)
);

create table if not exists public.whatsapp_delivery_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  approval_id uuid not null references public.action_approvals(id) on delete cascade,
  thread_id uuid references public.communication_threads(id) on delete set null,
  connection_id uuid references public.provider_connections(id) on delete set null,
  recipient_phone text not null,
  provider_message_id text,
  status text not null default 'pending' check (status in ('pending','accepted','sent','delivered','read','failed','blocked')),
  error_code text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(approval_id)
);

create table if not exists public.whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  workspace_id uuid references public.workspaces(id) on delete set null,
  connection_id uuid references public.provider_connections(id) on delete set null,
  event_type text not null,
  processed_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists communication_threads_workspace_idx on public.communication_threads(user_id, workspace_id, last_activity_at desc);
create index if not exists communication_messages_thread_idx on public.communication_messages(thread_id, created_at);
create index if not exists communication_drafts_thread_idx on public.communication_drafts(thread_id, status);
create index if not exists whatsapp_delivery_records_workspace_idx on public.whatsapp_delivery_records(workspace_id, status, created_at desc);

drop trigger if exists communication_threads_updated_at on public.communication_threads;
create trigger communication_threads_updated_at before update on public.communication_threads for each row execute function public.alma_set_updated_at();
drop trigger if exists communication_drafts_updated_at on public.communication_drafts;
create trigger communication_drafts_updated_at before update on public.communication_drafts for each row execute function public.alma_set_updated_at();
drop trigger if exists whatsapp_templates_updated_at on public.whatsapp_templates;
create trigger whatsapp_templates_updated_at before update on public.whatsapp_templates for each row execute function public.alma_set_updated_at();
drop trigger if exists whatsapp_opt_ins_updated_at on public.whatsapp_opt_ins;
create trigger whatsapp_opt_ins_updated_at before update on public.whatsapp_opt_ins for each row execute function public.alma_set_updated_at();
drop trigger if exists whatsapp_delivery_records_updated_at on public.whatsapp_delivery_records;
create trigger whatsapp_delivery_records_updated_at before update on public.whatsapp_delivery_records for each row execute function public.alma_set_updated_at();

alter table public.communication_threads enable row level security;
alter table public.communication_messages enable row level security;
alter table public.communication_drafts enable row level security;
alter table public.whatsapp_templates enable row level security;
alter table public.whatsapp_opt_ins enable row level security;
alter table public.whatsapp_delivery_records enable row level security;
alter table public.whatsapp_webhook_events enable row level security;

drop policy if exists "Users manage own communication threads" on public.communication_threads;
create policy "Users manage own communication threads" on public.communication_threads for all
using (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()))
with check (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()));

drop policy if exists "Users read own communication messages" on public.communication_messages;
create policy "Users read own communication messages" on public.communication_messages for select
using (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()));

drop policy if exists "Users manage own communication drafts" on public.communication_drafts;
create policy "Users manage own communication drafts" on public.communication_drafts for all
using (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()))
with check (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()));

drop policy if exists "Users read own whatsapp templates" on public.whatsapp_templates;
create policy "Users read own whatsapp templates" on public.whatsapp_templates for select
using (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()));

drop policy if exists "Users manage own whatsapp opt ins" on public.whatsapp_opt_ins;
create policy "Users manage own whatsapp opt ins" on public.whatsapp_opt_ins for all
using (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()))
with check (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()));

drop policy if exists "Users read own whatsapp delivery records" on public.whatsapp_delivery_records;
create policy "Users read own whatsapp delivery records" on public.whatsapp_delivery_records for select
using (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()));

revoke all on table public.whatsapp_webhook_events from anon, authenticated;
grant select on table public.communication_threads to authenticated;
grant select on table public.communication_messages to authenticated;
grant select, insert, update on table public.communication_drafts to authenticated;
grant select on table public.whatsapp_templates to authenticated;
grant select, insert, update on table public.whatsapp_opt_ins to authenticated;
grant select on table public.whatsapp_delivery_records to authenticated;
grant all on table public.communication_threads to service_role;
grant all on table public.communication_messages to service_role;
grant all on table public.communication_drafts to service_role;
grant all on table public.whatsapp_templates to service_role;
grant all on table public.whatsapp_opt_ins to service_role;
grant all on table public.whatsapp_delivery_records to service_role;
grant all on table public.whatsapp_webhook_events to service_role;

commit;
