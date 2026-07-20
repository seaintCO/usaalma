begin;

create or replace function public.alma_user_owns_workspace(input_workspace_id uuid, input_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspaces w
    where w.id = input_workspace_id and w.owner_id = input_user_id
  );
$$;

create or replace function public.alma_user_can_access_workspace(input_workspace_id uuid, input_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select input_workspace_id is null
    or exists (
      select 1 from public.workspaces w
      where w.id = input_workspace_id and w.owner_id = input_user_id
    )
    or exists (
      select 1 from public.workspace_members m
      where m.workspace_id = input_workspace_id and m.user_id = input_user_id
    );
$$;

drop policy if exists "Users read owned or member workspaces" on public.workspaces;
create policy "Users read owned or member workspaces" on public.workspaces for select
using (public.alma_user_can_access_workspace(id, auth.uid()));

drop policy if exists "Owners update owned workspaces" on public.workspaces;
create policy "Owners update owned workspaces" on public.workspaces for update
using (public.alma_user_owns_workspace(id, auth.uid()))
with check (public.alma_user_owns_workspace(id, auth.uid()));

drop policy if exists "Users read own workspace memberships" on public.workspace_members;
create policy "Users read own workspace memberships" on public.workspace_members for select
using (
  auth.uid() = user_id
  or public.alma_user_owns_workspace(workspace_id, auth.uid())
);

drop policy if exists "Owners manage workspace memberships" on public.workspace_members;
create policy "Owners manage workspace memberships" on public.workspace_members for all
using (public.alma_user_owns_workspace(workspace_id, auth.uid()))
with check (public.alma_user_owns_workspace(workspace_id, auth.uid()));

create table if not exists public.provider_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('gmail','outlook','quickbooks','stripe_connect','whatsapp_business')),
  provider_account_id text,
  provider_account_email text,
  provider_account_name text,
  connection_status text not null default 'not_connected'
    check (connection_status in ('not_connected','connecting','connected','expired','reauthorization_required','configuration_required','error','disconnected')),
  granted_scopes text[] not null default '{}',
  access_token_expires_at timestamptz,
  has_refresh_token boolean not null default false,
  last_successful_refresh_at timestamptz,
  last_successful_action_at timestamptz,
  last_error_code text,
  last_error_message text,
  connected_by_user_id uuid references auth.users(id) on delete set null,
  connected_at timestamptz,
  disconnected_at timestamptz,
  revoked_at timestamptz,
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, provider)
);

create table if not exists public.provider_connection_secrets (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null unique references public.provider_connections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('gmail','outlook','quickbooks','stripe_connect','whatsapp_business')),
  encrypted_access_token text,
  encrypted_refresh_token text,
  token_type text,
  scope text,
  expires_at timestamptz,
  provider_metadata jsonb not null default '{}'::jsonb,
  token_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_delivery_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  approval_id uuid references public.action_approvals(id) on delete set null,
  estimate_id uuid references public.office_estimates(id) on delete set null,
  connection_id uuid references public.provider_connections(id) on delete set null,
  provider text not null check (provider in ('gmail','outlook')),
  recipient text not null,
  subject text not null,
  provider_message_id text,
  status text not null default 'pending' check (status in ('pending','sent','failed','blocked')),
  error_code text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(approval_id)
);

create table if not exists public.office_estimate_follow_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  estimate_id uuid not null references public.office_estimates(id) on delete cascade,
  approval_id uuid references public.action_approvals(id) on delete set null,
  due_at timestamptz not null,
  message text,
  status text not null default 'scheduled' check (status in ('scheduled','proposed','awaiting_approval','completed','cancelled','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.office_estimates add column if not exists delivery_provider text;
alter table public.office_estimates add column if not exists delivery_connection_id uuid references public.provider_connections(id) on delete set null;
alter table public.office_estimates add column if not exists delivery_message_id text;
alter table public.office_estimates add column if not exists delivered_at timestamptz;

create index if not exists provider_connections_user_workspace_idx on public.provider_connections(user_id, workspace_id, provider);
create index if not exists provider_connections_status_idx on public.provider_connections(workspace_id, connection_status);
create index if not exists email_delivery_records_estimate_idx on public.email_delivery_records(estimate_id, status);
create index if not exists office_estimate_follow_ups_due_idx on public.office_estimate_follow_ups(status, due_at);

drop trigger if exists provider_connections_updated_at on public.provider_connections;
create trigger provider_connections_updated_at before update on public.provider_connections for each row execute function public.alma_set_updated_at();
drop trigger if exists provider_connection_secrets_updated_at on public.provider_connection_secrets;
create trigger provider_connection_secrets_updated_at before update on public.provider_connection_secrets for each row execute function public.alma_set_updated_at();
drop trigger if exists email_delivery_records_updated_at on public.email_delivery_records;
create trigger email_delivery_records_updated_at before update on public.email_delivery_records for each row execute function public.alma_set_updated_at();
drop trigger if exists office_estimate_follow_ups_updated_at on public.office_estimate_follow_ups;
create trigger office_estimate_follow_ups_updated_at before update on public.office_estimate_follow_ups for each row execute function public.alma_set_updated_at();

alter table public.provider_connections enable row level security;
alter table public.provider_connection_secrets enable row level security;
alter table public.email_delivery_records enable row level security;
alter table public.office_estimate_follow_ups enable row level security;

drop policy if exists "Users read own provider connection metadata" on public.provider_connections;
create policy "Users read own provider connection metadata" on public.provider_connections for select
using (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()));

drop policy if exists "Users read own email delivery records" on public.email_delivery_records;
create policy "Users read own email delivery records" on public.email_delivery_records for select
using (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()));

drop policy if exists "Users read own office estimate follow ups" on public.office_estimate_follow_ups;
create policy "Users read own office estimate follow ups" on public.office_estimate_follow_ups for select
using (user_id = auth.uid() and public.alma_user_can_access_workspace(workspace_id, auth.uid()));

revoke all on table public.provider_connection_secrets from anon, authenticated;
grant all on table public.provider_connection_secrets to service_role;
grant select on table public.provider_connections to authenticated;
grant select on table public.email_delivery_records to authenticated;
grant select on table public.office_estimate_follow_ups to authenticated;

commit;
