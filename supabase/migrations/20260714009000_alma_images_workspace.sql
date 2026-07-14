-- ALMA Images workspace. Additive; do not apply automatically.
begin;

create table if not exists public.generated_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  image_base64 text,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);
alter table public.generated_images add column if not exists source_image_id uuid references public.generated_images(id) on delete set null;
alter table public.generated_images add column if not exists execution_id uuid references public.agent_executions(id) on delete set null;
alter table public.generated_images add column if not exists idempotency_key text;
alter table public.generated_images add column if not exists aspect_ratio text not null default 'square';
alter table public.generated_images add column if not exists quality text not null default 'medium';
alter table public.generated_images add column if not exists mime_type text not null default 'image/png';
alter table public.generated_images add column if not exists updated_at timestamptz not null default now();
alter table public.generated_images drop constraint if exists generated_images_status_check;
alter table public.generated_images add constraint generated_images_status_check check(status in ('source','generating','completed','failed'));
alter table public.generated_images drop constraint if exists generated_images_aspect_ratio_check;
alter table public.generated_images add constraint generated_images_aspect_ratio_check check(aspect_ratio in ('square','landscape','portrait'));
alter table public.generated_images drop constraint if exists generated_images_quality_check;
alter table public.generated_images add constraint generated_images_quality_check check(quality in ('medium','high'));
create unique index if not exists generated_images_user_idempotency_idx on public.generated_images(user_id,idempotency_key) where idempotency_key is not null;
create index if not exists generated_images_user_created_idx on public.generated_images(user_id,created_at desc);
create index if not exists generated_images_source_idx on public.generated_images(source_image_id) where source_image_id is not null;
create or replace function public.set_generated_images_updated_at() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end $$;
create or replace function public.assert_generated_image_ownership() returns trigger language plpgsql security definer set search_path=public as $$ begin
 if new.source_image_id is not null and not exists(select 1 from public.generated_images source where source.id=new.source_image_id and source.user_id=new.user_id) then raise exception 'source image must belong to user' using errcode='42501'; end if;
 if new.execution_id is not null and not exists(select 1 from public.agent_executions execution where execution.id=new.execution_id and execution.user_id=new.user_id) then raise exception 'image execution must belong to user' using errcode='42501'; end if;
 return new;
end $$;
drop trigger if exists generated_images_updated_at on public.generated_images;
create trigger generated_images_updated_at before update on public.generated_images for each row execute function public.set_generated_images_updated_at();
drop trigger if exists generated_images_ownership on public.generated_images;
create trigger generated_images_ownership before insert or update on public.generated_images for each row execute function public.assert_generated_image_ownership();
alter table public.generated_images enable row level security;
drop policy if exists "Users manage own generated images" on public.generated_images;
create policy "Users manage own generated images" on public.generated_images for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
commit;
