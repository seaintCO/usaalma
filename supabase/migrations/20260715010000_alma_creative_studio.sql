-- ALMA Creative Studio metadata. Additive; do not apply automatically.
begin;
create table if not exists public.creative_brand_kits (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, voice text, audience text, colors jsonb not null default '[]'::jsonb, logo_image_id uuid references public.generated_images(id) on delete set null,
 "references" jsonb not null default '[]'::jsonb, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.creative_campaigns (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, brand_kit_id uuid references public.creative_brand_kits(id) on delete set null,
 folder_id uuid references public.creative_folders(id) on delete set null, name text not null, concept text, audience text, social_captions text, ad_copy text, product_photo_prompt text,
 metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.creative_assets add column if not exists brand_kit_id uuid references public.creative_brand_kits(id) on delete set null;
alter table public.creative_assets add column if not exists campaign_id uuid references public.creative_campaigns(id) on delete set null;
alter table public.creative_assets add column if not exists generated_image_id uuid references public.generated_images(id) on delete set null;
alter table public.creative_assets add column if not exists folder_id uuid references public.creative_folders(id) on delete set null;
alter table public.creative_assets add column if not exists updated_at timestamptz not null default now();
create index if not exists creative_brand_kits_user_idx on public.creative_brand_kits(user_id,updated_at desc);
create index if not exists creative_campaigns_user_idx on public.creative_campaigns(user_id,updated_at desc);
create index if not exists creative_assets_campaign_idx on public.creative_assets(campaign_id) where campaign_id is not null;
create or replace function public.set_creative_updated_at() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end $$;
create or replace function public.assert_creative_ownership() returns trigger language plpgsql security definer set search_path=public as $$ begin
 if tg_table_name='creative_brand_kits' and new.logo_image_id is not null and not exists(select 1 from public.generated_images i where i.id=new.logo_image_id and i.user_id=new.user_id) then raise exception 'logo image must belong to user' using errcode='42501'; end if;
 if tg_table_name='creative_campaigns' and ((new.brand_kit_id is not null and not exists(select 1 from public.creative_brand_kits b where b.id=new.brand_kit_id and b.user_id=new.user_id)) or (new.folder_id is not null and not exists(select 1 from public.creative_folders f where f.id=new.folder_id and f.user_id=new.user_id))) then raise exception 'campaign parents must belong to user' using errcode='42501'; end if;
 if tg_table_name='creative_assets' and ((new.brand_kit_id is not null and not exists(select 1 from public.creative_brand_kits b where b.id=new.brand_kit_id and b.user_id=new.user_id)) or (new.campaign_id is not null and not exists(select 1 from public.creative_campaigns c where c.id=new.campaign_id and c.user_id=new.user_id)) or (new.generated_image_id is not null and not exists(select 1 from public.generated_images i where i.id=new.generated_image_id and i.user_id=new.user_id)) or (new.folder_id is not null and not exists(select 1 from public.creative_folders f where f.id=new.folder_id and f.user_id=new.user_id))) then raise exception 'creative asset parents must belong to user' using errcode='42501'; end if;
 return new;
end $$;
drop trigger if exists creative_brand_kits_updated_at on public.creative_brand_kits; create trigger creative_brand_kits_updated_at before update on public.creative_brand_kits for each row execute function public.set_creative_updated_at();
drop trigger if exists creative_campaigns_updated_at on public.creative_campaigns; create trigger creative_campaigns_updated_at before update on public.creative_campaigns for each row execute function public.set_creative_updated_at();
drop trigger if exists creative_assets_updated_at on public.creative_assets; create trigger creative_assets_updated_at before update on public.creative_assets for each row execute function public.set_creative_updated_at();
drop trigger if exists creative_brand_kit_ownership on public.creative_brand_kits; create trigger creative_brand_kit_ownership before insert or update on public.creative_brand_kits for each row execute function public.assert_creative_ownership();
drop trigger if exists creative_campaign_ownership on public.creative_campaigns; create trigger creative_campaign_ownership before insert or update on public.creative_campaigns for each row execute function public.assert_creative_ownership();
drop trigger if exists creative_asset_ownership on public.creative_assets; create trigger creative_asset_ownership before insert or update on public.creative_assets for each row execute function public.assert_creative_ownership();
alter table public.creative_brand_kits enable row level security; alter table public.creative_campaigns enable row level security;
drop policy if exists "Users manage own creative brand kits" on public.creative_brand_kits; create policy "Users manage own creative brand kits" on public.creative_brand_kits for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "Users manage own creative campaigns" on public.creative_campaigns; create policy "Users manage own creative campaigns" on public.creative_campaigns for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
commit;
