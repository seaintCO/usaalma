-- Deterministic migration version: 20260714007000. Requires contacts and agent_executions.
begin;

alter table public.contacts add column if not exists first_name text;
alter table public.contacts add column if not exists last_name text;
alter table public.contacts add column if not exists job_title text;
alter table public.contacts add column if not exists company_id uuid;
alter table public.contacts add column if not exists source text not null default 'manual';
alter table public.contacts add column if not exists source_execution_id uuid references public.agent_executions(id) on delete set null;
alter table public.contacts add column if not exists notes text;
alter table public.contacts add column if not exists updated_at timestamptz not null default now();

create table if not exists public.companies (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, website text, industry text, phone text, address text, notes text,
 source text not null default 'manual', source_execution_id uuid references public.agent_executions(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.companies add column if not exists source text not null default 'manual';
alter table public.companies add column if not exists source_execution_id uuid references public.agent_executions(id) on delete set null;

do $$ begin
 if not exists (select 1 from pg_constraint where conname='contacts_company_fk' and conrelid='public.contacts'::regclass) then
  alter table public.contacts add constraint contacts_company_fk foreign key(company_id) references public.companies(id) on delete set null;
 end if;
end $$;

create table if not exists public.opportunities (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 company_id uuid references public.companies(id) on delete set null, primary_contact_id uuid references public.contacts(id) on delete set null,
 title text not null, value numeric, currency text not null default 'USD', stage text not null default 'lead', probability integer,
 expected_close_at timestamptz, source text not null default 'manual', source_execution_id uuid references public.agent_executions(id) on delete set null,
 notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(stage in('lead','contacted','qualified','proposal','negotiation','won','lost'))
);
alter table public.opportunities add column if not exists source_execution_id uuid references public.agent_executions(id) on delete set null;

create table if not exists public.crm_activities (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 contact_id uuid references public.contacts(id) on delete set null, company_id uuid references public.companies(id) on delete set null,
 opportunity_id uuid references public.opportunities(id) on delete set null, activity_type text not null, content text not null,
 source_execution_id uuid references public.agent_executions(id) on delete set null,
 occurred_at timestamptz not null default now(), created_at timestamptz not null default now()
);
alter table public.crm_activities add column if not exists source_execution_id uuid references public.agent_executions(id) on delete set null;

create unique index if not exists contacts_alma_execution_idx on public.contacts(user_id,source_execution_id) where source='alma_chat' and source_execution_id is not null;
create unique index if not exists companies_alma_execution_idx on public.companies(user_id,source_execution_id) where source='alma_chat' and source_execution_id is not null;
create unique index if not exists opportunities_alma_execution_idx on public.opportunities(user_id,source_execution_id) where source='alma_chat' and source_execution_id is not null;
create unique index if not exists crm_activities_execution_type_idx on public.crm_activities(user_id,source_execution_id,activity_type) where source_execution_id is not null;
create index if not exists opportunities_user_stage_idx on public.opportunities(user_id,stage);
create index if not exists contacts_user_name_idx on public.contacts(user_id,name);
create index if not exists companies_user_name_idx on public.companies(user_id,name);
create index if not exists crm_activities_user_occurred_idx on public.crm_activities(user_id,occurred_at desc);

create or replace function public.crm_set_updated_at() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end $$;
create or replace function public.assert_crm_ownership() returns trigger language plpgsql security definer set search_path=public as $$ begin
 if tg_table_name='contacts' and new.company_id is not null and not exists(select 1 from public.companies c where c.id=new.company_id and c.user_id=new.user_id) then raise exception 'contact company must belong to user' using errcode='42501'; end if;
 if tg_table_name='opportunities' and ((new.company_id is not null and not exists(select 1 from public.companies c where c.id=new.company_id and c.user_id=new.user_id)) or (new.primary_contact_id is not null and not exists(select 1 from public.contacts c where c.id=new.primary_contact_id and c.user_id=new.user_id))) then raise exception 'opportunity parents must belong to user' using errcode='42501'; end if;
 if tg_table_name='crm_activities' and ((new.contact_id is not null and not exists(select 1 from public.contacts c where c.id=new.contact_id and c.user_id=new.user_id)) or (new.company_id is not null and not exists(select 1 from public.companies c where c.id=new.company_id and c.user_id=new.user_id)) or (new.opportunity_id is not null and not exists(select 1 from public.opportunities o where o.id=new.opportunity_id and o.user_id=new.user_id))) then raise exception 'activity parents must belong to user' using errcode='42501'; end if;
 return new;
end $$;
drop trigger if exists contacts_updated_at on public.contacts; create trigger contacts_updated_at before update on public.contacts for each row execute function public.crm_set_updated_at();
drop trigger if exists companies_updated_at on public.companies; create trigger companies_updated_at before update on public.companies for each row execute function public.crm_set_updated_at();
drop trigger if exists opportunities_updated_at on public.opportunities; create trigger opportunities_updated_at before update on public.opportunities for each row execute function public.crm_set_updated_at();
drop trigger if exists crm_contacts_ownership on public.contacts; create trigger crm_contacts_ownership before insert or update on public.contacts for each row execute function public.assert_crm_ownership();
drop trigger if exists crm_opportunities_ownership on public.opportunities; create trigger crm_opportunities_ownership before insert or update on public.opportunities for each row execute function public.assert_crm_ownership();
drop trigger if exists crm_activities_ownership on public.crm_activities; create trigger crm_activities_ownership before insert or update on public.crm_activities for each row execute function public.assert_crm_ownership();

alter table public.contacts enable row level security; alter table public.companies enable row level security; alter table public.opportunities enable row level security; alter table public.crm_activities enable row level security;
drop policy if exists "Users manage own contacts" on public.contacts;
drop policy if exists "Users manage own companies" on public.companies;
drop policy if exists "Users manage own opportunities" on public.opportunities;
drop policy if exists "Users manage own crm activities" on public.crm_activities;
create policy "Users manage own contacts" on public.contacts for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "Users manage own companies" on public.companies for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "Users manage own opportunities" on public.opportunities for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "Users manage own crm activities" on public.crm_activities for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
commit;
