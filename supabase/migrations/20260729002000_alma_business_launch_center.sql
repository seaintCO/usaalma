begin;

-- ALMA Business Launch organizes a user's formation checklist. It deliberately
-- does not store SSNs, full EINs, identity documents, payment cards, or data
-- needed to impersonate the organizer on a government filing.
create table if not exists public.business_launch_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  country text not null default 'US' check (country = 'US'),
  formation_state text not null check (formation_state ~ '^[A-Z]{2}$'),
  entity_type text not null default 'undecided'
    check (entity_type in (
      'undecided','sole_proprietorship','llc','corporation','partnership','nonprofit'
    )),
  desired_name text not null check (char_length(desired_name) between 1 and 160),
  legal_name text,
  dba_name text,
  business_purpose text,
  industry text,
  city text,
  owner_count integer not null default 1
    check (owner_count between 1 and 1000),
  registered_agent_status text not null default 'undecided'
    check (registered_agent_status in ('undecided','self','third_party','confirmed')),
  state_filing_status text not null default 'not_started'
    check (state_filing_status in (
      'not_started','in_progress','submitted','approved','rejected'
    )),
  state_filing_number text,
  formation_date date,
  ein_status text not null default 'not_started'
    check (ein_status in ('not_started','in_progress','received','not_required')),
  ein_last_four text check (
    ein_last_four is null or ein_last_four ~ '^[0-9]{4}$'
  ),
  bank_status text not null default 'not_started'
    check (bank_status in ('not_started','in_progress','opened')),
  accounting_status text not null default 'not_started'
    check (accounting_status in ('not_started','in_progress','ready')),
  licenses_status text not null default 'not_reviewed'
    check (licenses_status in (
      'not_reviewed','in_progress','complete','not_required'
    )),
  insurance_status text not null default 'not_reviewed'
    check (insurance_status in (
      'not_reviewed','in_progress','covered','not_required'
    )),
  launch_status text not null default 'planning'
    check (launch_status in ('planning','filing','operating','paused')),
  last_reviewed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_launch_projects_scope_idx
  on public.business_launch_projects(workspace_id, user_id, updated_at desc)
  where archived_at is null;

create table if not exists public.business_launch_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.business_launch_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  code text not null check (code in (
    'structure_review','name_check','registered_agent','state_filing',
    'formation_documents','ein','state_tax','licenses','bank','insurance',
    'accounting','operating_documents','compliance_calendar','boi_check'
  )),
  stage text not null check (stage in (
    'foundation','registration','tax','operations','compliance'
  )),
  status text not null default 'not_started'
    check (status in ('not_started','in_progress','completed','not_applicable')),
  title text,
  notes text,
  due_date date,
  official_url text check (
    official_url is null or official_url ~ '^https://'
  ),
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, code)
);

create index if not exists business_launch_tasks_project_idx
  on public.business_launch_tasks(project_id, sort_order, created_at);

create table if not exists public.business_compliance_deadlines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.business_launch_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  due_date date not null,
  cadence text not null default 'one_time'
    check (cadence in ('one_time','monthly','quarterly','annual','custom')),
  status text not null default 'upcoming'
    check (status in ('upcoming','completed','dismissed')),
  official_url text check (
    official_url is null or official_url ~ '^https://'
  ),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_compliance_deadlines_scope_due_idx
  on public.business_compliance_deadlines(workspace_id, user_id, status, due_date);

create or replace function public.alma_business_launch_is_owner(
  target_user_id uuid,
  target_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() = target_user_id
    and (
      target_workspace_id is null
      or exists (
        select 1
        from public.workspaces w
        where w.id = target_workspace_id
          and w.owner_id = auth.uid()
      )
    );
$$;

revoke all on function public.alma_business_launch_is_owner(uuid, uuid)
  from public, anon;
grant execute on function public.alma_business_launch_is_owner(uuid, uuid)
  to authenticated, service_role;

alter table public.business_launch_projects enable row level security;
alter table public.business_launch_tasks enable row level security;
alter table public.business_compliance_deadlines enable row level security;

drop policy if exists "Owners manage business launch projects"
  on public.business_launch_projects;
create policy "Owners manage business launch projects"
on public.business_launch_projects
for all to authenticated
using (public.alma_business_launch_is_owner(user_id, workspace_id))
with check (public.alma_business_launch_is_owner(user_id, workspace_id));

drop policy if exists "Owners manage business launch tasks"
  on public.business_launch_tasks;
create policy "Owners manage business launch tasks"
on public.business_launch_tasks
for all to authenticated
using (public.alma_business_launch_is_owner(user_id, workspace_id))
with check (public.alma_business_launch_is_owner(user_id, workspace_id));

drop policy if exists "Owners manage business compliance deadlines"
  on public.business_compliance_deadlines;
create policy "Owners manage business compliance deadlines"
on public.business_compliance_deadlines
for all to authenticated
using (public.alma_business_launch_is_owner(user_id, workspace_id))
with check (public.alma_business_launch_is_owner(user_id, workspace_id));

drop trigger if exists business_launch_projects_updated_at
  on public.business_launch_projects;
create trigger business_launch_projects_updated_at
before update on public.business_launch_projects
for each row execute function public.alma_business_set_updated_at();

drop trigger if exists business_launch_tasks_updated_at
  on public.business_launch_tasks;
create trigger business_launch_tasks_updated_at
before update on public.business_launch_tasks
for each row execute function public.alma_business_set_updated_at();

drop trigger if exists business_compliance_deadlines_updated_at
  on public.business_compliance_deadlines;
create trigger business_compliance_deadlines_updated_at
before update on public.business_compliance_deadlines
for each row execute function public.alma_business_set_updated_at();

create or replace function public.alma_seed_business_launch_tasks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.business_launch_tasks (
    project_id, user_id, workspace_id, code, stage, official_url, sort_order
  )
  values
    (new.id,new.user_id,new.workspace_id,'structure_review','foundation',
      'https://www.sba.gov/business-guide/launch-your-business/choose-business-structure',10),
    (new.id,new.user_id,new.workspace_id,'name_check','foundation',
      'https://www.sba.gov/business-guide/launch-your-business/choose-your-business-name',20),
    (new.id,new.user_id,new.workspace_id,'registered_agent','foundation',
      'https://www.sba.gov/business-guide/launch-your-business/register-your-business',30),
    (new.id,new.user_id,new.workspace_id,'state_filing','registration',
      'https://www.sba.gov/business-guide/launch-your-business/register-your-business',40),
    (new.id,new.user_id,new.workspace_id,'formation_documents','registration',null,50),
    (new.id,new.user_id,new.workspace_id,'ein','tax',
      'https://www.irs.gov/businesses/employer-identification-number',60),
    (new.id,new.user_id,new.workspace_id,'state_tax','tax',
      'https://www.sba.gov/business-guide/launch-your-business',70),
    (new.id,new.user_id,new.workspace_id,'licenses','operations',
      'https://www.sba.gov/business-guide/launch-your-business/apply-licenses-permits',80),
    (new.id,new.user_id,new.workspace_id,'bank','operations',
      'https://www.sba.gov/business-guide/launch-your-business/open-business-bank-account',90),
    (new.id,new.user_id,new.workspace_id,'insurance','operations',
      'https://www.sba.gov/business-guide/launch-your-business/get-business-insurance',100),
    (new.id,new.user_id,new.workspace_id,'accounting','operations',null,110),
    (new.id,new.user_id,new.workspace_id,'operating_documents','compliance',
      'https://www.sba.gov/business-guide/manage-your-business/stay-legally-compliant',120),
    (new.id,new.user_id,new.workspace_id,'compliance_calendar','compliance',
      'https://www.sba.gov/business-guide/manage-your-business/stay-legally-compliant',130),
    (new.id,new.user_id,new.workspace_id,'boi_check','compliance',
      'https://www.fincen.gov/boi',140)
  on conflict (project_id, code) do nothing;
  return new;
end;
$$;

drop trigger if exists business_launch_projects_seed_tasks
  on public.business_launch_projects;
create trigger business_launch_projects_seed_tasks
after insert on public.business_launch_projects
for each row execute function public.alma_seed_business_launch_tasks();

commit;
