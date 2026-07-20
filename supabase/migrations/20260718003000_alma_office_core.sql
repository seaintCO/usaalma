begin;

create table if not exists public.office_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  display_name text not null,
  legal_name text,
  email text,
  phone text,
  website text,
  address text,
  default_currency text not null default 'USD',
  default_tax_rate numeric not null default 0 check(default_tax_rate >= 0),
  estimate_terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.office_profiles add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.office_profiles add column if not exists company_id uuid references public.companies(id) on delete set null;
alter table public.office_profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.office_services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  description_en text,
  description_es text,
  unit_type text not null default 'each',
  standard_rate numeric not null default 0 check(standard_rate >= 0),
  minimum_charge numeric not null default 0 check(minimum_charge >= 0),
  taxable boolean not null default true,
  default_deposit_percentage numeric not null default 0 check(default_deposit_percentage >= 0 and default_deposit_percentage <= 100),
  active boolean not null default true,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.office_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  name text not null,
  jobsite_address text,
  description text,
  status text not null default 'active' check(status in ('active','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.office_estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  project_id uuid references public.office_projects(id) on delete set null,
  converted_invoice_id uuid references public.invoices(id) on delete set null,
  estimate_number text not null,
  status text not null default 'draft' check(status in ('draft','awaiting_review','approved','sent','viewed','accepted','rejected','expired','converted_to_invoice','cancelled')),
  currency text not null default 'USD',
  scope text,
  message text,
  subtotal numeric not null default 0 check(subtotal >= 0),
  discount_amount numeric not null default 0 check(discount_amount >= 0),
  tax_rate numeric not null default 0 check(tax_rate >= 0),
  tax_amount numeric not null default 0 check(tax_amount >= 0),
  total numeric not null default 0 check(total >= 0),
  deposit_percentage numeric not null default 0 check(deposit_percentage >= 0 and deposit_percentage <= 100),
  deposit_amount numeric not null default 0 check(deposit_amount >= 0),
  remaining_balance numeric not null default 0 check(remaining_balance >= 0),
  expires_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  source text not null default 'manual',
  source_execution_id uuid references public.agent_executions(id) on delete set null,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.office_estimate_line_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.office_estimates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  service_id uuid references public.office_services(id) on delete set null,
  description text not null,
  quantity numeric not null default 1 check(quantity > 0),
  unit_type text not null default 'each',
  unit_rate numeric not null default 0 check(unit_rate >= 0),
  discount_amount numeric not null default 0 check(discount_amount >= 0),
  taxable boolean not null default true,
  tax_amount numeric not null default 0 check(tax_amount >= 0),
  line_total numeric not null default 0 check(line_total >= 0),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.office_estimate_attachments (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.office_estimates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  file_name text,
  file_path text,
  mime_type text,
  notes text,
  analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.office_estimate_status_history (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.office_estimates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  source text not null default 'system',
  approval_id uuid references public.action_approvals(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists office_profiles_user_workspace_idx on public.office_profiles(user_id, coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists office_services_user_active_idx on public.office_services(user_id, active, name);
create index if not exists office_projects_user_status_idx on public.office_projects(user_id, status, created_at desc);
create unique index if not exists office_estimates_user_number_idx on public.office_estimates(user_id, estimate_number);
create unique index if not exists office_estimates_idempotency_idx on public.office_estimates(user_id, idempotency_key) where idempotency_key is not null;
create index if not exists office_estimate_lines_estimate_idx on public.office_estimate_line_items(estimate_id, user_id);
create index if not exists office_estimate_attachments_estimate_idx on public.office_estimate_attachments(estimate_id, user_id);
create index if not exists office_estimate_history_estimate_idx on public.office_estimate_status_history(estimate_id, created_at desc);

create or replace function public.office_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.office_user_has_workspace(input_workspace_id uuid, input_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select input_workspace_id is null
    or exists(select 1 from public.workspaces w where w.id = input_workspace_id and w.owner_id = input_user_id)
    or exists(select 1 from public.workspace_members m where m.workspace_id = input_workspace_id and m.user_id = input_user_id);
$$;

create or replace function public.assert_office_ownership()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.office_user_has_workspace(new.workspace_id, new.user_id) then
    raise exception 'Office workspace must belong to user.' using errcode='42501';
  end if;

  if tg_table_name in ('office_profiles','office_projects','office_estimates') and new.company_id is not null and not exists(select 1 from public.companies c where c.id = new.company_id and c.user_id = new.user_id) then
    raise exception 'Office company must belong to user.' using errcode='42501';
  end if;

  if tg_table_name in ('office_projects','office_estimates') and new.contact_id is not null and not exists(select 1 from public.contacts c where c.id = new.contact_id and c.user_id = new.user_id) then
    raise exception 'Office contact must belong to user.' using errcode='42501';
  end if;

  if tg_table_name = 'office_estimates' and new.project_id is not null and not exists(select 1 from public.office_projects p where p.id = new.project_id and p.user_id = new.user_id) then
    raise exception 'Office project must belong to user.' using errcode='42501';
  end if;

  if tg_table_name = 'office_estimates' and new.converted_invoice_id is not null and not exists(select 1 from public.invoices i where i.id = new.converted_invoice_id and i.user_id = new.user_id) then
    raise exception 'Office invoice must belong to user.' using errcode='42501';
  end if;

  return new;
end;
$$;

create or replace function public.assert_office_estimate_child_ownership()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists(select 1 from public.office_estimates e where e.id = new.estimate_id and e.user_id = new.user_id) then
    raise exception 'Office child row must belong to estimate owner.' using errcode='42501';
  end if;

  if tg_table_name = 'office_estimate_line_items' and new.service_id is not null and not exists(select 1 from public.office_services s where s.id = new.service_id and s.user_id = new.user_id) then
    raise exception 'Office service must belong to user.' using errcode='42501';
  end if;

  if tg_table_name = 'office_estimate_attachments' and new.document_id is not null and not exists(select 1 from public.documents d where d.id = new.document_id and d.user_id = new.user_id) then
    raise exception 'Office document must belong to user.' using errcode='42501';
  end if;

  return new;
end;
$$;

drop trigger if exists office_profiles_updated_at on public.office_profiles;
create trigger office_profiles_updated_at before update on public.office_profiles for each row execute function public.office_set_updated_at();
drop trigger if exists office_services_updated_at on public.office_services;
create trigger office_services_updated_at before update on public.office_services for each row execute function public.office_set_updated_at();
drop trigger if exists office_projects_updated_at on public.office_projects;
create trigger office_projects_updated_at before update on public.office_projects for each row execute function public.office_set_updated_at();
drop trigger if exists office_estimates_updated_at on public.office_estimates;
create trigger office_estimates_updated_at before update on public.office_estimates for each row execute function public.office_set_updated_at();
drop trigger if exists office_estimate_line_items_updated_at on public.office_estimate_line_items;
create trigger office_estimate_line_items_updated_at before update on public.office_estimate_line_items for each row execute function public.office_set_updated_at();
drop trigger if exists office_estimate_attachments_updated_at on public.office_estimate_attachments;
create trigger office_estimate_attachments_updated_at before update on public.office_estimate_attachments for each row execute function public.office_set_updated_at();

drop trigger if exists office_profiles_ownership on public.office_profiles;
create trigger office_profiles_ownership before insert or update on public.office_profiles for each row execute function public.assert_office_ownership();
drop trigger if exists office_services_ownership on public.office_services;
create trigger office_services_ownership before insert or update on public.office_services for each row execute function public.assert_office_ownership();
drop trigger if exists office_projects_ownership on public.office_projects;
create trigger office_projects_ownership before insert or update on public.office_projects for each row execute function public.assert_office_ownership();
drop trigger if exists office_estimates_ownership on public.office_estimates;
create trigger office_estimates_ownership before insert or update on public.office_estimates for each row execute function public.assert_office_ownership();
drop trigger if exists office_estimate_line_items_ownership on public.office_estimate_line_items;
create trigger office_estimate_line_items_ownership before insert or update on public.office_estimate_line_items for each row execute function public.assert_office_estimate_child_ownership();
drop trigger if exists office_estimate_attachments_ownership on public.office_estimate_attachments;
create trigger office_estimate_attachments_ownership before insert or update on public.office_estimate_attachments for each row execute function public.assert_office_estimate_child_ownership();
drop trigger if exists office_estimate_status_history_ownership on public.office_estimate_status_history;
create trigger office_estimate_status_history_ownership before insert or update on public.office_estimate_status_history for each row execute function public.assert_office_estimate_child_ownership();

alter table public.office_profiles enable row level security;
alter table public.office_services enable row level security;
alter table public.office_projects enable row level security;
alter table public.office_estimates enable row level security;
alter table public.office_estimate_line_items enable row level security;
alter table public.office_estimate_attachments enable row level security;
alter table public.office_estimate_status_history enable row level security;

drop policy if exists "Users manage own office profiles" on public.office_profiles;
drop policy if exists "Users manage own office services" on public.office_services;
drop policy if exists "Users manage own office projects" on public.office_projects;
drop policy if exists "Users manage own office estimates" on public.office_estimates;
drop policy if exists "Users manage own office estimate lines" on public.office_estimate_line_items;
drop policy if exists "Users manage own office estimate attachments" on public.office_estimate_attachments;
drop policy if exists "Users manage own office estimate history" on public.office_estimate_status_history;

create policy "Users manage own office profiles" on public.office_profiles for all to authenticated using(user_id = auth.uid() and public.office_user_has_workspace(workspace_id, auth.uid())) with check(user_id = auth.uid() and public.office_user_has_workspace(workspace_id, auth.uid()));
create policy "Users manage own office services" on public.office_services for all to authenticated using(user_id = auth.uid() and public.office_user_has_workspace(workspace_id, auth.uid())) with check(user_id = auth.uid() and public.office_user_has_workspace(workspace_id, auth.uid()));
create policy "Users manage own office projects" on public.office_projects for all to authenticated using(user_id = auth.uid() and public.office_user_has_workspace(workspace_id, auth.uid())) with check(user_id = auth.uid() and public.office_user_has_workspace(workspace_id, auth.uid()));
create policy "Users manage own office estimates" on public.office_estimates for all to authenticated using(user_id = auth.uid() and public.office_user_has_workspace(workspace_id, auth.uid())) with check(user_id = auth.uid() and public.office_user_has_workspace(workspace_id, auth.uid()));
create policy "Users manage own office estimate lines" on public.office_estimate_line_items for all to authenticated using(user_id = auth.uid() and exists(select 1 from public.office_estimates e where e.id = estimate_id and e.user_id = auth.uid() and public.office_user_has_workspace(e.workspace_id, auth.uid()))) with check(user_id = auth.uid() and exists(select 1 from public.office_estimates e where e.id = estimate_id and e.user_id = auth.uid() and public.office_user_has_workspace(e.workspace_id, auth.uid())));
create policy "Users manage own office estimate attachments" on public.office_estimate_attachments for all to authenticated using(user_id = auth.uid() and exists(select 1 from public.office_estimates e where e.id = estimate_id and e.user_id = auth.uid() and public.office_user_has_workspace(e.workspace_id, auth.uid()))) with check(user_id = auth.uid() and exists(select 1 from public.office_estimates e where e.id = estimate_id and e.user_id = auth.uid() and public.office_user_has_workspace(e.workspace_id, auth.uid())));
create policy "Users manage own office estimate history" on public.office_estimate_status_history for all to authenticated using(user_id = auth.uid() and exists(select 1 from public.office_estimates e where e.id = estimate_id and e.user_id = auth.uid() and public.office_user_has_workspace(e.workspace_id, auth.uid()))) with check(user_id = auth.uid() and exists(select 1 from public.office_estimates e where e.id = estimate_id and e.user_id = auth.uid() and public.office_user_has_workspace(e.workspace_id, auth.uid())));

commit;
