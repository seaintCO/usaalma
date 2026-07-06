create table if not exists public.app_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  app_key text not null,
  status text not null default 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, app_key)
);

alter table public.app_subscriptions enable row level security;

drop policy if exists "Users can read own app subscriptions" on public.app_subscriptions;
create policy "Users can read own app subscriptions"
on public.app_subscriptions
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own app subscriptions" on public.app_subscriptions;
create policy "Users can insert own app subscriptions"
on public.app_subscriptions
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own app subscriptions" on public.app_subscriptions;
create policy "Users can update own app subscriptions"
on public.app_subscriptions
for update
using (auth.uid() = user_id);
