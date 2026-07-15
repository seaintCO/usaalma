-- AI workspace closeout hardening. Additive and intentionally unapplied.
begin;
alter table public.launch_studio_projects add column if not exists duplicate_idempotency_key text;
create unique index if not exists launch_studio_projects_user_duplicate_key_idx on public.launch_studio_projects(user_id,duplicate_idempotency_key) where duplicate_idempotency_key is not null;
alter table public.creative_assets add column if not exists source_asset_id uuid references public.creative_assets(id) on delete set null;
create index if not exists creative_assets_source_asset_idx on public.creative_assets(source_asset_id) where source_asset_id is not null;
create or replace function public.assert_ai_workspace_ownership() returns trigger language plpgsql security definer set search_path=public as $$ begin
 if tg_table_name='trading_analyses' and new.screenshot_id is not null and not exists(select 1 from public.generated_images i where i.id=new.screenshot_id and i.user_id=new.user_id) then raise exception 'analysis screenshot must belong to user' using errcode='42501'; end if;
 if tg_table_name in ('trading_watchlist','trading_analyses','trading_journal') and new.source_execution_id is not null and not exists(select 1 from public.agent_executions e where e.id=new.source_execution_id and e.user_id=new.user_id) then raise exception 'source execution must belong to user' using errcode='42501'; end if;
 if tg_table_name='creative_assets' and new.source_asset_id is not null and not exists(select 1 from public.creative_assets a where a.id=new.source_asset_id and a.user_id=new.user_id) then raise exception 'source asset must belong to user' using errcode='42501'; end if;
 return new;
end $$;
drop trigger if exists trading_analyses_ownership_closeout on public.trading_analyses; create trigger trading_analyses_ownership_closeout before insert or update on public.trading_analyses for each row execute function public.assert_ai_workspace_ownership();
drop trigger if exists trading_watchlist_execution_ownership_closeout on public.trading_watchlist; create trigger trading_watchlist_execution_ownership_closeout before insert or update on public.trading_watchlist for each row execute function public.assert_ai_workspace_ownership();
drop trigger if exists trading_journal_execution_ownership_closeout on public.trading_journal; create trigger trading_journal_execution_ownership_closeout before insert or update on public.trading_journal for each row execute function public.assert_ai_workspace_ownership();
drop trigger if exists creative_assets_version_ownership_closeout on public.creative_assets; create trigger creative_assets_version_ownership_closeout before insert or update on public.creative_assets for each row execute function public.assert_ai_workspace_ownership();
commit;
