begin;

create table if not exists public.business_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  period_month date not null,
  category text not null default 'all',
  amount numeric(14,2) not null check (amount >= 0),
  alert_threshold_percent integer not null default 90
    check (alert_threshold_percent between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, workspace_id, period_month, category)
);

create table if not exists public.voice_agent_setup_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  status text not null default 'checkout_pending'
    check (status in (
      'checkout_pending',
      'paid',
      'call_booked',
      'in_setup',
      'ready_to_connect',
      'completed',
      'cancelled',
      'refunded'
    )),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  amount integer not null default 29900 check (amount >= 0),
  currency text not null default 'usd',
  booking_url text,
  booked_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_delivery_records
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null;

create index if not exists business_budgets_user_period_idx
  on public.business_budgets(user_id, period_month);
create index if not exists voice_agent_setup_orders_user_idx
  on public.voice_agent_setup_orders(user_id, created_at desc);
create index if not exists email_delivery_records_invoice_idx
  on public.email_delivery_records(invoice_id, status);

drop trigger if exists business_budgets_set_updated_at on public.business_budgets;
create trigger business_budgets_set_updated_at
before update on public.business_budgets
for each row execute function public.alma_set_updated_at();

drop trigger if exists voice_agent_setup_orders_set_updated_at on public.voice_agent_setup_orders;
create trigger voice_agent_setup_orders_set_updated_at
before update on public.voice_agent_setup_orders
for each row execute function public.alma_set_updated_at();

alter table public.business_budgets enable row level security;
alter table public.voice_agent_setup_orders enable row level security;

drop policy if exists "Users manage own business budgets" on public.business_budgets;
create policy "Users manage own business budgets"
on public.business_budgets for all to authenticated
using (
  user_id = auth.uid()
  and public.alma_user_can_access_workspace(workspace_id, auth.uid())
)
with check (
  user_id = auth.uid()
  and public.alma_user_can_access_workspace(workspace_id, auth.uid())
);

drop policy if exists "Users read own voice setup orders" on public.voice_agent_setup_orders;
create policy "Users read own voice setup orders"
on public.voice_agent_setup_orders for select to authenticated
using (
  user_id = auth.uid()
  and public.alma_user_can_access_workspace(workspace_id, auth.uid())
);

revoke insert, update, delete on public.voice_agent_setup_orders
from anon, authenticated;
grant select, insert, update, delete on public.business_budgets to authenticated;
grant select on public.voice_agent_setup_orders to authenticated;

commit;
