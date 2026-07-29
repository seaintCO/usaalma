begin;

create or replace function public.alma_business_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create or replace function public.alma_business_workspace_access(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_workspace_id is null
    or exists (
      select 1 from public.workspaces w
      where w.id = target_workspace_id and w.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = target_workspace_id and wm.user_id = auth.uid()
    );
$$;

create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  operating_mode text not null default 'business'
    check (operating_mode in ('business', 'creator', 'both')),
  legal_name text,
  display_name text,
  industry text,
  preferred_language text not null default 'en'
    check (preferred_language in ('en', 'es')),
  email text,
  phone text,
  address jsonb not null default '{}'::jsonb,
  tax_year_start_month integer not null default 1
    check (tax_year_start_month between 1 and 12),
  bookkeeping_basis text not null default 'cash'
    check (bookkeeping_basis in ('cash', 'accrual')),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists business_profiles_workspace_idx
  on public.business_profiles(workspace_id) where workspace_id is not null;
create unique index if not exists business_profiles_personal_idx
  on public.business_profiles(user_id) where workspace_id is null;

create table if not exists public.business_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  transaction_date date not null default current_date,
  description text not null,
  merchant text,
  amount numeric(14,2) not null check (amount >= 0),
  direction text not null check (direction in ('income', 'expense')),
  transaction_type text not null default 'operating'
    check (transaction_type in (
      'operating', 'transfer', 'refund', 'owner_contribution',
      'owner_draw', 'loan', 'payroll', 'tax'
    )),
  category text,
  suggested_category text,
  category_status text not null default 'unreviewed'
    check (category_status in ('unreviewed', 'suggested', 'confirmed')),
  review_status text not null default 'needs_review'
    check (review_status in ('needs_review', 'reviewed', 'excluded')),
  payment_method text,
  contact_id uuid references public.contacts(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  notes text,
  external_source text,
  external_id text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists business_transactions_idempotency_idx
  on public.business_transactions(user_id, idempotency_key)
  where idempotency_key is not null;
create index if not exists business_transactions_scope_date_idx
  on public.business_transactions(workspace_id, user_id, transaction_date desc);
create index if not exists business_transactions_review_idx
  on public.business_transactions(workspace_id, user_id, review_status);

create table if not exists public.business_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  transaction_id uuid references public.business_transactions(id) on delete set null,
  merchant text,
  receipt_date date,
  amount numeric(14,2) check (amount is null or amount >= 0),
  tax_amount numeric(14,2) check (tax_amount is null or tax_amount >= 0),
  category text,
  payment_method text,
  customer_id uuid references public.contacts(id) on delete set null,
  storage_path text,
  original_filename text,
  content_type text,
  file_size integer check (file_size is null or file_size between 1 and 15728640),
  extraction_status text not null default 'manual'
    check (extraction_status in ('manual', 'queued', 'extracted', 'failed')),
  review_status text not null default 'needs_review'
    check (review_status in ('needs_review', 'matched', 'reviewed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_receipts_review_idx
  on public.business_receipts(workspace_id, user_id, review_status, created_at desc);

create table if not exists public.business_appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  location text,
  notes text,
  external_calendar_id text,
  reminder_minutes integer not null default 60 check (reminder_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists business_appointments_scope_start_idx
  on public.business_appointments(workspace_id, user_id, starts_at);

create table if not exists public.business_payroll_people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  display_name text not null,
  worker_type text not null check (worker_type in ('employee', 'contractor')),
  pay_type text not null check (pay_type in ('hourly', 'salary', 'project')),
  rate numeric(14,2) not null default 0 check (rate >= 0),
  active boolean not null default true,
  w9_status text not null default 'not_applicable'
    check (w9_status in ('not_applicable', 'missing', 'received')),
  provider_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_payroll_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  pay_date date,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'approved', 'exported')),
  gross_pay numeric(14,2) not null default 0 check (gross_pay >= 0),
  reimbursements numeric(14,2) not null default 0 check (reimbursements >= 0),
  bonuses numeric(14,2) not null default 0 check (bonuses >= 0),
  deduction_notes text,
  approved_at timestamptz,
  export_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create table if not exists public.business_tax_checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  tax_year integer not null check (tax_year between 2000 and 2200),
  quarter integer not null default 0 check (quarter between 0 and 4),
  checklist jsonb not null default '{}'::jsonb,
  notes text,
  completed_items integer not null default 0 check (completed_items >= 0),
  total_items integer not null default 8 check (total_items > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, workspace_id, tax_year, quarter)
);

create table if not exists public.quickbooks_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  provider_connection_id uuid references public.provider_connections(id) on delete set null,
  realm_id text not null,
  company_name text,
  environment text not null default 'sandbox'
    check (environment in ('sandbox', 'production')),
  status text not null default 'connected'
    check (status in ('connected', 'reauthorization_required', 'error', 'disconnected')),
  sync_direction text not null default 'review'
    check (sync_direction in ('review', 'alma_to_quickbooks', 'quickbooks_to_alma')),
  last_successful_sync_at timestamptz,
  last_error_code text,
  disconnected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists quickbooks_connections_scope_idx
  on public.quickbooks_connections(user_id, coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where disconnected_at is null;

create table if not exists public.quickbooks_sync_logs (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.quickbooks_connections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  entity_type text not null,
  direction text not null check (direction in ('push', 'pull')),
  status text not null check (status in ('queued', 'running', 'review', 'completed', 'failed')),
  processed_count integer not null default 0,
  conflict_count integer not null default 0,
  safe_error_code text,
  idempotency_key text not null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (connection_id, idempotency_key)
);

create table if not exists public.workspace_autonomy_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  autonomy_mode text not null default 'draft'
    check (autonomy_mode in ('manual', 'draft', 'assisted', 'autonomous')),
  external_messages_require_approval boolean not null default true,
  financial_actions_require_approval boolean not null default true,
  destructive_actions_require_approval boolean not null default true,
  max_external_actions_per_day integer not null default 25
    check (max_external_actions_per_day between 0 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workspace_autonomy_settings_scope_idx
  on public.workspace_autonomy_settings(user_id, coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'business_profiles',
    'business_transactions',
    'business_receipts',
    'business_appointments',
    'business_payroll_people',
    'business_payroll_periods',
    'business_tax_checklists',
    'quickbooks_connections',
    'quickbooks_sync_logs',
    'workspace_autonomy_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "ALMA business office scoped access" on public.%I', table_name);
    execute format(
      'create policy "ALMA business office scoped access" on public.%I
       for all to authenticated
       using (
         (workspace_id is null and user_id = auth.uid())
         or (workspace_id is not null and public.alma_business_workspace_access(workspace_id))
       )
       with check (
         user_id = auth.uid()
         and (workspace_id is null or public.alma_business_workspace_access(workspace_id))
       )',
      table_name
    );
    execute format('drop trigger if exists %I on public.%I', table_name || '_updated_at', table_name);
    if table_name <> 'quickbooks_sync_logs' then
      execute format(
        'create trigger %I before update on public.%I
         for each row execute function public.alma_business_set_updated_at()',
        table_name || '_updated_at',
        table_name
      );
    end if;
  end loop;
end
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'alma-business-receipts',
  'alma-business-receipts',
  false,
  15728640,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users manage own business receipts" on storage.objects;
create policy "Users manage own business receipts"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'alma-business-receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'alma-business-receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

revoke all on public.quickbooks_connections from anon;
revoke all on public.quickbooks_sync_logs from anon;

commit;
