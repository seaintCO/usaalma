begin;

alter table public.alma_user_settings add column if not exists notification_email_enabled boolean not null default true;
alter table public.alma_user_settings add column if not exists notification_in_app_enabled boolean not null default true;

update public.alma_user_settings
set preferred_ai_model = 'gpt-4.1-mini'
where preferred_ai_model is null or preferred_ai_model not in ('gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini');

update public.alma_user_settings
set preferred_image_model = 'gpt-image-2'
where preferred_image_model is null or preferred_image_model <> 'gpt-image-2';

alter table public.alma_user_settings alter column preferred_ai_model set default 'gpt-4.1-mini';
alter table public.alma_user_settings alter column preferred_image_model set default 'gpt-image-2';
alter table public.alma_user_settings enable row level security;
drop policy if exists "Users manage own ALMA settings" on public.alma_user_settings;
create policy "Users manage own ALMA settings" on public.alma_user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

commit;
