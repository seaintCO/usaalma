begin;

create table if not exists public.mobile_push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null,
  expo_push_token text not null,
  platform text not null default 'ios',
  app_version text,
  locale text not null default 'en',
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mobile_push_devices_platform_check check (platform = 'ios'),
  constraint mobile_push_devices_locale_check check (locale in ('en', 'es')),
  constraint mobile_push_devices_token_check check (char_length(expo_push_token) between 20 and 256),
  unique (user_id, device_id)
);

create index if not exists mobile_push_devices_user_enabled_idx
  on public.mobile_push_devices(user_id, enabled, last_seen_at desc);

alter table public.mobile_push_devices enable row level security;

drop policy if exists "Users read own mobile devices" on public.mobile_push_devices;
create policy "Users read own mobile devices" on public.mobile_push_devices
for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users register own mobile devices" on public.mobile_push_devices;
create policy "Users register own mobile devices" on public.mobile_push_devices
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users update own mobile devices" on public.mobile_push_devices;
create policy "Users update own mobile devices" on public.mobile_push_devices
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users delete own mobile devices" on public.mobile_push_devices;
create policy "Users delete own mobile devices" on public.mobile_push_devices
for delete to authenticated using (user_id = auth.uid());

create or replace function public.alma_set_mobile_device_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mobile_push_devices_updated_at on public.mobile_push_devices;
create trigger mobile_push_devices_updated_at before update on public.mobile_push_devices
for each row execute function public.alma_set_mobile_device_updated_at();

commit;
