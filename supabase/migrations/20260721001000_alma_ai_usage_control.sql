begin;

alter table public.chat_runs add column if not exists alma_mode text not null default 'instant'
  check (alma_mode in ('instant','thinking','pro'));

create table if not exists public.ai_usage_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid null references public.workspaces(id) on delete cascade,
  subscription_id uuid null references public.subscriptions(id) on delete set null,
  plan text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end > period_start)
);

create unique index if not exists ai_usage_periods_scope_unique
on public.ai_usage_periods(user_id, coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), period_start, period_end);

create table if not exists public.ai_usage_reservations (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.ai_usage_periods(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid null references public.workspaces(id) on delete cascade,
  feature text not null,
  alma_mode text null,
  provider_model text null,
  status text not null default 'reserved' check (status in ('reserved','settled','released','expired')),
  reserved_units integer not null check (reserved_units > 0),
  idempotency_key text not null,
  provider_request_reference text null,
  created_at timestamptz not null default now(),
  settled_at timestamptz null,
  released_at timestamptz null,
  expires_at timestamptz not null default (now() + interval '15 minutes')
);

create unique index if not exists ai_usage_reservations_idempotency_unique
on public.ai_usage_reservations(user_id, coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), feature, idempotency_key);
create index if not exists ai_usage_reservations_active_idx
on public.ai_usage_reservations(user_id, workspace_id, status, created_at);

alter table public.builder_jobs add column if not exists usage_reservation_id uuid null
  references public.ai_usage_reservations(id) on delete set null;
alter table public.voice_sessions add column if not exists usage_reservation_id uuid null
  references public.ai_usage_reservations(id) on delete set null;

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.ai_usage_periods(id) on delete restrict,
  reservation_id uuid not null unique references public.ai_usage_reservations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid null references public.workspaces(id) on delete cascade,
  feature text not null,
  alma_mode text null,
  provider_model text null,
  status text not null check (status in ('succeeded','failed','cancelled')),
  actual_units integer not null default 0 check (actual_units >= 0),
  actual_input_tokens bigint not null default 0 check (actual_input_tokens >= 0),
  actual_cached_tokens bigint not null default 0 check (actual_cached_tokens >= 0),
  actual_output_tokens bigint not null default 0 check (actual_output_tokens >= 0),
  actual_reasoning_tokens bigint not null default 0 check (actual_reasoning_tokens >= 0),
  image_count integer not null default 0 check (image_count >= 0),
  voice_seconds integer not null default 0 check (voice_seconds >= 0),
  document_pages integer not null default 0 check (document_pages >= 0),
  builder_job_count integer not null default 0 check (builder_job_count >= 0),
  idempotency_key text not null,
  provider_request_reference text null,
  created_at timestamptz not null default now(),
  settled_at timestamptz not null default now()
);

create index if not exists ai_usage_events_period_feature_idx
on public.ai_usage_events(period_id, feature, alma_mode, created_at);

alter table public.ai_usage_periods enable row level security;
alter table public.ai_usage_reservations enable row level security;
alter table public.ai_usage_events enable row level security;

create or replace function public.can_read_ai_usage(target_user_id uuid, target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() = target_user_id or (
    target_workspace_id is not null and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = target_workspace_id and wm.user_id = auth.uid()
    )
  );
$$;

drop policy if exists "Usage periods are scoped" on public.ai_usage_periods;
create policy "Usage periods are scoped" on public.ai_usage_periods for select using (public.can_read_ai_usage(user_id, workspace_id));
drop policy if exists "Usage reservations are scoped" on public.ai_usage_reservations;
create policy "Usage reservations are scoped" on public.ai_usage_reservations for select using (public.can_read_ai_usage(user_id, workspace_id));
drop policy if exists "Usage events are scoped" on public.ai_usage_events;
create policy "Usage events are scoped" on public.ai_usage_events for select using (public.can_read_ai_usage(user_id, workspace_id));

revoke insert, update, delete on public.ai_usage_periods, public.ai_usage_reservations, public.ai_usage_events from anon, authenticated;
grant select on public.ai_usage_periods, public.ai_usage_reservations, public.ai_usage_events to authenticated;

create or replace function public.reserve_ai_usage(
  p_user_id uuid, p_workspace_id uuid, p_subscription_id uuid, p_plan text,
  p_period_start timestamptz, p_period_end timestamptz, p_feature text,
  p_alma_mode text, p_provider_model text, p_requested_units integer,
  p_period_limit integer, p_daily_limit integer, p_concurrency_limit integer,
  p_builder_concurrency_limit integer, p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_period_id uuid; v_existing ai_usage_reservations%rowtype;
  v_period_used bigint := 0; v_daily_used bigint := 0; v_active integer := 0; v_builder_active integer := 0;
  v_reservation ai_usage_reservations%rowtype;
begin
  if p_requested_units <= 0 or p_period_limit <= 0 then
    return jsonb_build_object('allowed', false, 'code', 'feature_not_in_plan');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || coalesce(p_workspace_id::text, 'personal'), 0));
  update ai_usage_reservations set status='expired', released_at=now()
    where user_id=p_user_id and workspace_id is not distinct from p_workspace_id and status='reserved' and expires_at <= now();
  select * into v_existing from ai_usage_reservations
    where user_id=p_user_id and workspace_id is not distinct from p_workspace_id and feature=p_feature and idempotency_key=p_idempotency_key;
  if found and v_existing.status in ('reserved','settled') then
    return jsonb_build_object('allowed', false, 'code', 'idempotency_replayed', 'reservation_id', v_existing.id, 'period_id', v_existing.period_id);
  end if;
  insert into ai_usage_periods(user_id,workspace_id,subscription_id,plan,period_start,period_end)
    values(p_user_id,p_workspace_id,p_subscription_id,p_plan,p_period_start,p_period_end)
    on conflict(user_id,(coalesce(workspace_id,'00000000-0000-0000-0000-000000000000'::uuid)),period_start,period_end)
    do update set plan=excluded.plan, subscription_id=excluded.subscription_id, updated_at=now()
    returning id into v_period_id;
  select coalesce(sum(actual_units),0) into v_period_used from ai_usage_events
    where period_id=v_period_id and feature=p_feature and alma_mode is not distinct from p_alma_mode and status='succeeded';
  select v_period_used + coalesce(sum(reserved_units),0) into v_period_used from ai_usage_reservations
    where period_id=v_period_id and feature=p_feature and alma_mode is not distinct from p_alma_mode and status='reserved';
  if v_period_used + p_requested_units > p_period_limit then return jsonb_build_object('allowed',false,'code','period_limit_reached','used',v_period_used,'limit',p_period_limit); end if;
  if p_feature='ai_request' then
    select coalesce(sum(actual_units),0) into v_daily_used from ai_usage_events where user_id=p_user_id and workspace_id is not distinct from p_workspace_id and feature='ai_request' and status='succeeded' and created_at >= date_trunc('day',now());
    select v_daily_used + coalesce(sum(reserved_units),0) into v_daily_used from ai_usage_reservations where user_id=p_user_id and workspace_id is not distinct from p_workspace_id and feature='ai_request' and status='reserved' and created_at >= date_trunc('day',now());
    if v_daily_used + p_requested_units > p_daily_limit then return jsonb_build_object('allowed',false,'code','daily_limit_reached','used',v_daily_used,'limit',p_daily_limit); end if;
  end if;
  select count(distinct idempotency_key) into v_active from ai_usage_reservations where user_id=p_user_id and workspace_id is not distinct from p_workspace_id and status='reserved' and idempotency_key<>p_idempotency_key;
  if v_active >= p_concurrency_limit then return jsonb_build_object('allowed',false,'code','concurrency_limit_reached','limit',p_concurrency_limit); end if;
  if p_feature='builder_build' then
    select count(*) into v_builder_active from ai_usage_reservations where user_id=p_user_id and workspace_id is not distinct from p_workspace_id and feature='builder_build' and status='reserved';
    if v_builder_active >= p_builder_concurrency_limit then return jsonb_build_object('allowed',false,'code','builder_concurrency_reached','limit',p_builder_concurrency_limit); end if;
  end if;
  if v_existing.id is not null then
    update ai_usage_reservations set period_id=v_period_id,status='reserved',reserved_units=p_requested_units,provider_model=p_provider_model,created_at=now(),settled_at=null,released_at=null,expires_at=case when p_feature='builder_build' then now()+interval '2 hours' else now()+interval '15 minutes' end where id=v_existing.id returning * into v_reservation;
  else
    insert into ai_usage_reservations(period_id,user_id,workspace_id,feature,alma_mode,provider_model,reserved_units,idempotency_key,expires_at)
      values(v_period_id,p_user_id,p_workspace_id,p_feature,p_alma_mode,p_provider_model,p_requested_units,p_idempotency_key,case when p_feature='builder_build' then now()+interval '2 hours' else now()+interval '15 minutes' end) returning * into v_reservation;
  end if;
  return jsonb_build_object('allowed',true,'reservation_id',v_reservation.id,'period_id',v_period_id,'remaining',greatest(0,p_period_limit-v_period_used-p_requested_units));
end; $$;

create or replace function public.settle_ai_usage(
  p_reservation_id uuid, p_actual_units integer, p_input_tokens bigint,
  p_cached_tokens bigint, p_output_tokens bigint, p_reasoning_tokens bigint,
  p_image_count integer, p_voice_seconds integer, p_document_pages integer,
  p_builder_jobs integer, p_provider_reference text
) returns boolean language plpgsql security definer set search_path=public as $$
declare v ai_usage_reservations%rowtype;
begin
  select * into v from ai_usage_reservations where id=p_reservation_id for update;
  if not found then return false; end if;
  if v.status='settled' then return true; end if;
  if v.status<>'reserved' then return false; end if;
  update ai_usage_reservations set status='settled',settled_at=now(),provider_request_reference=left(p_provider_reference,200) where id=v.id;
  insert into ai_usage_events(period_id,reservation_id,user_id,workspace_id,feature,alma_mode,provider_model,status,actual_units,actual_input_tokens,actual_cached_tokens,actual_output_tokens,actual_reasoning_tokens,image_count,voice_seconds,document_pages,builder_job_count,idempotency_key,provider_request_reference)
  values(v.period_id,v.id,v.user_id,v.workspace_id,v.feature,v.alma_mode,v.provider_model,'succeeded',greatest(0,p_actual_units),greatest(0,p_input_tokens),greatest(0,p_cached_tokens),greatest(0,p_output_tokens),greatest(0,p_reasoning_tokens),greatest(0,p_image_count),greatest(0,p_voice_seconds),greatest(0,p_document_pages),greatest(0,p_builder_jobs),v.idempotency_key,left(p_provider_reference,200));
  return true;
end; $$;

create or replace function public.release_ai_usage(p_reservation_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  update ai_usage_reservations set status='released',released_at=now() where id=p_reservation_id and status='reserved';
  return found;
end; $$;

create or replace function public.read_ai_usage_summary(p_user_id uuid, p_workspace_id uuid, p_period_start timestamptz, p_period_end timestamptz)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_used jsonb; v_daily bigint; v_recent jsonb;
begin
  select coalesce(jsonb_object_agg(metric,total),'{}'::jsonb) into v_used from (
    select case when feature='ai_request' then alma_mode else feature end metric, sum(units) total from (
      select feature,alma_mode,actual_units::bigint units from ai_usage_events where user_id=p_user_id and workspace_id is not distinct from p_workspace_id and status='succeeded' and created_at>=p_period_start and created_at<p_period_end
      union all
      select feature,alma_mode,reserved_units::bigint units from ai_usage_reservations where user_id=p_user_id and workspace_id is not distinct from p_workspace_id and status='reserved' and expires_at>now()
    ) rows group by metric
  ) totals;
  select coalesce(sum(units),0) into v_daily from (
    select actual_units::bigint units from ai_usage_events where user_id=p_user_id and workspace_id is not distinct from p_workspace_id and feature='ai_request' and status='succeeded' and created_at>=date_trunc('day',now())
    union all
    select reserved_units::bigint units from ai_usage_reservations where user_id=p_user_id and workspace_id is not distinct from p_workspace_id and feature='ai_request' and status='reserved' and expires_at>now() and created_at>=date_trunc('day',now())
  ) daily;
  select coalesce(jsonb_agg(to_jsonb(recent)),'[]'::jsonb) into v_recent from (
    select id,feature,alma_mode,actual_units,actual_input_tokens,actual_cached_tokens,actual_output_tokens,actual_reasoning_tokens,image_count,voice_seconds,document_pages,builder_job_count,provider_model,created_at
    from ai_usage_events where user_id=p_user_id and workspace_id is not distinct from p_workspace_id and status='succeeded' and created_at>=p_period_start and created_at<p_period_end order by created_at desc limit 50
  ) recent;
  return jsonb_build_object('used',v_used,'daily_ai_used',v_daily,'recent',v_recent);
end; $$;

revoke all on function public.reserve_ai_usage(uuid,uuid,uuid,text,timestamptz,timestamptz,text,text,text,integer,integer,integer,integer,integer,text) from public, anon, authenticated;
revoke all on function public.settle_ai_usage(uuid,integer,bigint,bigint,bigint,bigint,integer,integer,integer,integer,text) from public, anon, authenticated;
revoke all on function public.release_ai_usage(uuid) from public, anon, authenticated;
revoke all on function public.read_ai_usage_summary(uuid,uuid,timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.reserve_ai_usage(uuid,uuid,uuid,text,timestamptz,timestamptz,text,text,text,integer,integer,integer,integer,integer,text) to service_role;
grant execute on function public.settle_ai_usage(uuid,integer,bigint,bigint,bigint,bigint,integer,integer,integer,integer,text) to service_role;
grant execute on function public.release_ai_usage(uuid) to service_role;
grant execute on function public.read_ai_usage_summary(uuid,uuid,timestamptz,timestamptz) to service_role;

commit;
