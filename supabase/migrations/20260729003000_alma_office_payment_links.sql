-- ALMA Office customer payment links and merchant connection authority.
-- Additive only. Customer payment credentials remain in the existing
-- server-only provider_connection_secrets table.

alter table public.provider_connections
  drop constraint if exists provider_connections_provider_check;
alter table public.provider_connections
  add constraint provider_connections_provider_check
  check (provider in (
    'gmail', 'outlook', 'quickbooks', 'stripe_connect', 'paypal_business',
    'whatsapp_business', 'github_app', 'elevenlabs', 'twilio'
  ));

alter table public.provider_connection_secrets
  drop constraint if exists provider_connection_secrets_provider_check;
alter table public.provider_connection_secrets
  add constraint provider_connection_secrets_provider_check
  check (provider in (
    'gmail', 'outlook', 'quickbooks', 'stripe_connect', 'paypal_business',
    'whatsapp_business', 'github_app', 'elevenlabs', 'twilio'
  ));

create table if not exists public.office_payment_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  connection_id uuid not null references public.provider_connections(id) on delete restrict,
  provider text not null check (provider in ('stripe_connect', 'paypal_business')),
  public_token_hash text not null unique check (length(public_token_hash) = 64),
  provider_checkout_id text,
  provider_checkout_url text,
  status text not null default 'active'
    check (status in ('active', 'processing', 'paid', 'cancelled', 'expired', 'failed')),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  expires_at timestamptz,
  paid_at timestamptz,
  last_error_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists office_payment_links_active_invoice_provider_idx
  on public.office_payment_links(invoice_id, provider)
  where status in ('active', 'processing');
create index if not exists office_payment_links_workspace_created_idx
  on public.office_payment_links(workspace_id, created_at desc);
create index if not exists office_payment_links_provider_checkout_idx
  on public.office_payment_links(provider, provider_checkout_id)
  where provider_checkout_id is not null;

create table if not exists public.office_payment_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  payment_link_id uuid references public.office_payment_links(id) on delete set null,
  provider text not null check (provider in ('stripe_connect', 'paypal_business')),
  provider_event_id text not null,
  event_type text not null,
  status text not null default 'received'
    check (status in ('received', 'processed', 'ignored', 'failed')),
  amount numeric(14,2),
  currency text,
  safe_error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique(provider, provider_event_id)
);

create index if not exists office_payment_events_link_received_idx
  on public.office_payment_events(payment_link_id, received_at desc);

drop trigger if exists office_payment_links_set_updated_at on public.office_payment_links;
create trigger office_payment_links_set_updated_at
before update on public.office_payment_links
for each row execute function public.alma_set_updated_at();

alter table public.office_payment_links enable row level security;
alter table public.office_payment_events enable row level security;

drop policy if exists "Users read own office payment links" on public.office_payment_links;
create policy "Users read own office payment links"
on public.office_payment_links for select
to authenticated
using (
  user_id = auth.uid()
  and public.office_user_has_workspace(workspace_id, auth.uid())
);

drop policy if exists "Users read own office payment events" on public.office_payment_events;
create policy "Users read own office payment events"
on public.office_payment_events for select
to authenticated
using (
  user_id = auth.uid()
  and public.office_user_has_workspace(workspace_id, auth.uid())
);

revoke all on public.office_payment_links from anon;
revoke all on public.office_payment_events from anon;
grant select on public.office_payment_links to authenticated;
grant select on public.office_payment_events to authenticated;
grant all on public.office_payment_links to service_role;
grant all on public.office_payment_events to service_role;
