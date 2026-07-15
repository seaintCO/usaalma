-- ALMA Trader workspace. Additive and intentionally unapplied.
begin;
create table if not exists public.trading_watchlist (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null check (symbol = upper(symbol) and symbol ~ '^[A-Z0-9.:-]{1,24}$'), asset_type text not null default 'equity' check (asset_type in ('equity','etf','crypto','option','future','other')),
  notes text, source_execution_id uuid references public.agent_executions(id) on delete set null, idempotency_key text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id, symbol), unique(user_id, idempotency_key)
);
create table if not exists public.trading_analyses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  symbol text, timeframe text, screenshot_id uuid references public.generated_images(id) on delete set null,
  content text not null, notes text, source_execution_id uuid references public.agent_executions(id) on delete set null, idempotency_key text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id, idempotency_key)
);
create table if not exists public.trading_journal (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null, direction text not null default 'long' check(direction in ('long','short','analysis','other')), setup text, entry_price numeric, exit_price numeric, position_size numeric,
  stop_price numeric, target_price numeric, profit_loss numeric, strategy text, emotions text, lessons text, notes text, screenshot_id uuid references public.generated_images(id) on delete set null,
  analysis_id uuid references public.trading_analyses(id) on delete set null, opened_at timestamptz, closed_at timestamptz, tags text[] not null default '{}',
  source_execution_id uuid references public.agent_executions(id) on delete set null, idempotency_key text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,idempotency_key)
);
create index if not exists trading_watchlist_user_created_idx on public.trading_watchlist(user_id,created_at desc);
create index if not exists trading_journal_user_symbol_opened_idx on public.trading_journal(user_id,symbol,opened_at desc);
create index if not exists trading_analyses_user_symbol_created_idx on public.trading_analyses(user_id,symbol,created_at desc);
create or replace function public.trader_set_updated_at() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists trading_watchlist_updated_at on public.trading_watchlist; create trigger trading_watchlist_updated_at before update on public.trading_watchlist for each row execute function public.trader_set_updated_at();
drop trigger if exists trading_journal_updated_at on public.trading_journal; create trigger trading_journal_updated_at before update on public.trading_journal for each row execute function public.trader_set_updated_at();
drop trigger if exists trading_analyses_updated_at on public.trading_analyses; create trigger trading_analyses_updated_at before update on public.trading_analyses for each row execute function public.trader_set_updated_at();
alter table public.trading_watchlist enable row level security; alter table public.trading_journal enable row level security; alter table public.trading_analyses enable row level security;
drop policy if exists "owned trader watchlist" on public.trading_watchlist; create policy "owned trader watchlist" on public.trading_watchlist for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "owned trader analyses" on public.trading_analyses; create policy "owned trader analyses" on public.trading_analyses for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "owned trader journal" on public.trading_journal; create policy "owned trader journal" on public.trading_journal for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and (analysis_id is null or exists(select 1 from public.trading_analyses a where a.id=analysis_id and a.user_id=auth.uid())) and (screenshot_id is null or exists(select 1 from public.generated_images i where i.id=screenshot_id and i.user_id=auth.uid())));
commit;
