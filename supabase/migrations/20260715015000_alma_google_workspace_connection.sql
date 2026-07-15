-- Google Workspace connection hardening. Additive and intentionally unapplied.
begin;

create table if not exists public.oauth_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  connected boolean not null default false,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  scopes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.oauth_connections add column if not exists provider_account_email text;
alter table public.oauth_connections add column if not exists provider_account_id text;
alter table public.oauth_connections add column if not exists access_token text;
alter table public.oauth_connections add column if not exists refresh_token text;
alter table public.oauth_connections add column if not exists expires_at timestamptz;
alter table public.oauth_connections add column if not exists scopes text;
alter table public.oauth_connections add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.oauth_connections add column if not exists created_at timestamptz not null default now();
alter table public.oauth_connections add column if not exists updated_at timestamptz not null default now();
alter table public.oauth_connections add column if not exists connected_at timestamptz;
alter table public.oauth_connections add column if not exists last_refreshed_at timestamptz;
alter table public.oauth_connections add column if not exists disconnected_at timestamptz;
alter table public.oauth_connections add column if not exists connection_status text not null default 'disconnected';
alter table public.oauth_connections add column if not exists connection_error text;
alter table public.oauth_connections add column if not exists encrypted_secret text;
alter table public.oauth_connections add column if not exists account_sid text;

alter table public.oauth_connections drop constraint if exists oauth_connections_connection_status_check;
alter table public.oauth_connections add constraint oauth_connections_connection_status_check check (connection_status in ('connected', 'reconnect_required', 'disconnected'));
create unique index if not exists oauth_connections_user_provider_unique_idx on public.oauth_connections(user_id, provider);
create index if not exists oauth_connections_user_provider_status_idx on public.oauth_connections(user_id, provider, connection_status);

-- Preserve prior real Google connections while moving to the canonical provider key.
update public.oauth_connections legacy
set provider = 'google_workspace',
    connection_status = case when legacy.connected then 'connected' else 'disconnected' end,
    updated_at = now()
where legacy.provider = 'google'
  and not exists (
    select 1 from public.oauth_connections canonical
    where canonical.user_id = legacy.user_id and canonical.provider = 'google_workspace'
  );

create or replace function public.set_oauth_connections_updated_at()
returns trigger language plpgsql set search_path=public as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists oauth_connections_updated_at on public.oauth_connections;
create trigger oauth_connections_updated_at
before update on public.oauth_connections
for each row execute function public.set_oauth_connections_updated_at();

alter table public.oauth_connections enable row level security;
-- OAuth token rows are server-only. Route handlers verify user ownership before
-- using the service role; clients receive only derived catalog status.
revoke all on table public.oauth_connections from anon, authenticated;
grant all on table public.oauth_connections to service_role;

commit;
