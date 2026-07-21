begin;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid null references public.workspaces(id) on delete set null,
  stripe_customer_id text null,
  stripe_subscription_id text null,
  price_id text null,
  plan text not null default 'free',
  status text not null default 'inactive',
  current_period_start timestamptz null,
  current_period_end timestamptz null,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz null,
  payment_failed_at timestamptz null,
  last_stripe_event_id text null,
  last_stripe_event_created bigint null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.subscriptions add column if not exists workspace_id uuid null references public.workspaces(id) on delete set null;
alter table public.subscriptions add column if not exists stripe_customer_id text null;
alter table public.subscriptions add column if not exists stripe_subscription_id text null;
alter table public.subscriptions add column if not exists price_id text null;
alter table public.subscriptions add column if not exists plan text not null default 'free';
alter table public.subscriptions add column if not exists status text not null default 'inactive';
alter table public.subscriptions add column if not exists current_period_start timestamptz null;
alter table public.subscriptions add column if not exists current_period_end timestamptz null;
alter table public.subscriptions add column if not exists cancel_at_period_end boolean not null default false;
alter table public.subscriptions add column if not exists trial_end timestamptz null;
alter table public.subscriptions add column if not exists payment_failed_at timestamptz null;
alter table public.subscriptions add column if not exists last_stripe_event_id text null;
alter table public.subscriptions add column if not exists last_stripe_event_created bigint null;
alter table public.subscriptions add column if not exists created_at timestamptz not null default now();
alter table public.subscriptions add column if not exists updated_at timestamptz not null default now();

create unique index if not exists subscriptions_user_id_unique on public.subscriptions(user_id);
create unique index if not exists subscriptions_stripe_customer_unique on public.subscriptions(stripe_customer_id) where stripe_customer_id is not null;
create unique index if not exists subscriptions_stripe_subscription_unique on public.subscriptions(stripe_subscription_id) where stripe_subscription_id is not null;

alter table public.subscriptions enable row level security;
drop policy if exists "Users can read own subscription" on public.subscriptions;
create policy "Users can read own subscription" on public.subscriptions for select using (auth.uid() = user_id);
revoke insert, update, delete on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;

create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  event_created bigint not null,
  processing_status text not null check (processing_status in ('processing','processed','failed')),
  processed_at timestamptz null,
  created_at timestamptz not null default now()
);
alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from anon, authenticated;

commit;
