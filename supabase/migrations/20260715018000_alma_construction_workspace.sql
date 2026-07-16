begin;

create table if not exists public.construction_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_name text not null,
  contact_id uuid references public.contacts(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  jobsite_address text,
  project_type text not null default 'custom',
  status text not null default 'draft',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint construction_projects_type_check check (project_type in ('masonry','chimney','wall','floor','roof','deck','fence','remodel','custom')),
  constraint construction_projects_status_check check (status in ('draft','active','completed','archived'))
);

create table if not exists public.construction_plan_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.construction_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  page_count integer,
  image_width integer,
  image_height integer,
  title text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint construction_plan_files_mime_check check (mime_type in ('application/pdf','image/png','image/jpeg')),
  constraint construction_plan_files_size_check check (size_bytes > 0)
);

create table if not exists public.construction_measurements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.construction_projects(id) on delete cascade,
  plan_file_id uuid references public.construction_plan_files(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  measurement_type text not null,
  label text not null,
  length numeric,
  width numeric,
  height_or_depth numeric,
  quantity numeric not null default 1,
  unit text not null,
  waste_percentage numeric not null default 0,
  base_total numeric not null default 0,
  adjusted_total numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint construction_measurements_type_check check (measurement_type in ('linear','area','volume','perimeter','count')),
  constraint construction_measurements_unit_check check (unit in ('feet','inches','square_feet','cubic_feet','yards','square_yards','cubic_yards','each')),
  constraint construction_measurements_quantity_check check (quantity > 0),
  constraint construction_measurements_waste_check check (waste_percentage >= 0 and waste_percentage <= 100),
  constraint construction_measurements_totals_check check (base_total >= 0 and adjusted_total >= 0)
);

create table if not exists public.construction_material_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.construction_projects(id) on delete cascade,
  name text not null,
  trade_type text not null,
  is_system boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint construction_material_templates_trade_check check (trade_type in ('masonry','chimney','floor','roof','wall','custom')),
  constraint construction_material_templates_owner_check check ((is_system and user_id is null and project_id is null) or (not is_system and user_id is not null))
);

create table if not exists public.construction_material_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.construction_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid references public.construction_material_templates(id) on delete set null,
  measurement_id uuid references public.construction_measurements(id) on delete set null,
  material_name text not null,
  source_measurement_type text,
  conversion_factor numeric not null default 1,
  unit text not null,
  calculated_quantity numeric not null default 0,
  manual_quantity_override numeric,
  waste_factor numeric not null default 0,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint construction_material_items_conversion_check check (conversion_factor >= 0),
  constraint construction_material_items_calculated_check check (calculated_quantity >= 0),
  constraint construction_material_items_manual_check check (manual_quantity_override is null or manual_quantity_override >= 0),
  constraint construction_material_items_waste_check check (waste_factor >= 0 and waste_factor <= 100)
);

create table if not exists public.construction_annotations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.construction_projects(id) on delete cascade,
  plan_file_id uuid not null references public.construction_plan_files(id) on delete cascade,
  measurement_id uuid references public.construction_measurements(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  annotation_type text not null,
  x1 numeric not null,
  y1 numeric not null,
  x2 numeric,
  y2 numeric,
  label text,
  color_key text not null default 'black',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint construction_annotations_type_check check (annotation_type in ('point','line','rectangle','text')),
  constraint construction_annotations_coords_check check (x1 >= 0 and x1 <= 1 and y1 >= 0 and y1 <= 1 and (x2 is null or (x2 >= 0 and x2 <= 1)) and (y2 is null or (y2 >= 0 and y2 <= 1)))
);

create table if not exists public.construction_scope_sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.construction_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  section_key text not null,
  title text not null,
  content text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint construction_scope_sections_key_check check (section_key in ('project_summary','included_work','exclusions','assumptions','material_notes','access_site_notes','customer_notes'))
);

create table if not exists public.construction_crew_instructions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.construction_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  checklist jsonb not null default '[]'::jsonb,
  work_sequence text,
  measurement_references jsonb not null default '[]'::jsonb,
  material_summary_notes text,
  plan_file_references jsonb not null default '[]'::jsonb,
  user_safety_notes text,
  assigned_crew_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id)
);

create table if not exists public.construction_export_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.construction_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  idempotency_key text,
  storage_path text,
  filename text,
  error_code text,
  error_message text,
  source_snapshot jsonb not null default '{}'::jsonb,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint construction_export_records_status_check check (status in ('pending','generating','completed','failed'))
);

create index if not exists construction_projects_user_status_updated_idx on public.construction_projects(user_id,status,updated_at desc);
create index if not exists construction_projects_user_archived_idx on public.construction_projects(user_id,archived_at);
create index if not exists construction_plan_files_project_created_idx on public.construction_plan_files(project_id,created_at desc);
create index if not exists construction_plan_files_user_project_idx on public.construction_plan_files(user_id,project_id);
create index if not exists construction_measurements_project_type_idx on public.construction_measurements(project_id,measurement_type);
create index if not exists construction_measurements_user_project_idx on public.construction_measurements(user_id,project_id);
create index if not exists construction_material_items_project_idx on public.construction_material_items(project_id,sort_order);
create index if not exists construction_annotations_plan_file_idx on public.construction_annotations(plan_file_id,created_at);
create unique index if not exists construction_scope_sections_project_key_idx on public.construction_scope_sections(project_id,section_key);
create index if not exists construction_export_records_project_created_idx on public.construction_export_records(project_id,created_at desc);
create unique index if not exists construction_export_records_idempotency_idx on public.construction_export_records(user_id,project_id,idempotency_key) where idempotency_key is not null;

create or replace function public.set_construction_updated_at() returns trigger language plpgsql set search_path=public as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists construction_projects_updated_at on public.construction_projects;
create trigger construction_projects_updated_at before update on public.construction_projects for each row execute function public.set_construction_updated_at();
drop trigger if exists construction_plan_files_updated_at on public.construction_plan_files;
create trigger construction_plan_files_updated_at before update on public.construction_plan_files for each row execute function public.set_construction_updated_at();
drop trigger if exists construction_measurements_updated_at on public.construction_measurements;
create trigger construction_measurements_updated_at before update on public.construction_measurements for each row execute function public.set_construction_updated_at();
drop trigger if exists construction_material_templates_updated_at on public.construction_material_templates;
create trigger construction_material_templates_updated_at before update on public.construction_material_templates for each row execute function public.set_construction_updated_at();
drop trigger if exists construction_material_items_updated_at on public.construction_material_items;
create trigger construction_material_items_updated_at before update on public.construction_material_items for each row execute function public.set_construction_updated_at();
drop trigger if exists construction_annotations_updated_at on public.construction_annotations;
create trigger construction_annotations_updated_at before update on public.construction_annotations for each row execute function public.set_construction_updated_at();
drop trigger if exists construction_scope_sections_updated_at on public.construction_scope_sections;
create trigger construction_scope_sections_updated_at before update on public.construction_scope_sections for each row execute function public.set_construction_updated_at();
drop trigger if exists construction_crew_instructions_updated_at on public.construction_crew_instructions;
create trigger construction_crew_instructions_updated_at before update on public.construction_crew_instructions for each row execute function public.set_construction_updated_at();
drop trigger if exists construction_export_records_updated_at on public.construction_export_records;
create trigger construction_export_records_updated_at before update on public.construction_export_records for each row execute function public.set_construction_updated_at();

create or replace function public.validate_construction_project_refs() returns trigger language plpgsql set search_path=public as $$
begin
  if new.contact_id is not null and not exists(select 1 from public.contacts c where c.id=new.contact_id and c.user_id=new.user_id) then
    raise exception 'Invalid construction contact ownership';
  end if;
  if new.company_id is not null and not exists(select 1 from public.companies c where c.id=new.company_id and c.user_id=new.user_id) then
    raise exception 'Invalid construction company ownership';
  end if;
  return new;
end $$;

create or replace function public.validate_construction_child_refs() returns trigger language plpgsql set search_path=public as $$
begin
  if not exists(select 1 from public.construction_projects p where p.id=new.project_id and p.user_id=new.user_id) then
    raise exception 'Invalid construction project ownership';
  end if;

  if tg_table_name = 'construction_plan_files' then
    if new.document_id is not null and not exists(select 1 from public.documents d where d.id=new.document_id and d.user_id=new.user_id) then
      raise exception 'Invalid construction document ownership';
    end if;
  end if;

  if tg_table_name in ('construction_measurements','construction_annotations') then
    if new.plan_file_id is not null and not exists(select 1 from public.construction_plan_files f where f.id=new.plan_file_id and f.project_id=new.project_id and f.user_id=new.user_id) then
      raise exception 'Invalid construction plan file ownership';
    end if;
  end if;

  if tg_table_name = 'construction_material_items' then
    if new.measurement_id is not null and not exists(select 1 from public.construction_measurements m where m.id=new.measurement_id and m.project_id=new.project_id and m.user_id=new.user_id) then
      raise exception 'Invalid construction measurement ownership';
    end if;
    if new.template_id is not null and not exists(select 1 from public.construction_material_templates t where t.id=new.template_id and (t.is_system or t.user_id=new.user_id) and (t.project_id is null or t.project_id=new.project_id)) then
      raise exception 'Invalid construction material template ownership';
    end if;
  end if;

  if tg_table_name = 'construction_annotations' then
    if new.measurement_id is not null and not exists(select 1 from public.construction_measurements m where m.id=new.measurement_id and m.project_id=new.project_id and m.user_id=new.user_id) then
      raise exception 'Invalid construction annotation measurement ownership';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists validate_construction_project_refs_insert_update on public.construction_projects;
create trigger validate_construction_project_refs_insert_update before insert or update on public.construction_projects for each row execute function public.validate_construction_project_refs();

drop trigger if exists validate_construction_plan_files_refs_insert_update on public.construction_plan_files;
create trigger validate_construction_plan_files_refs_insert_update before insert or update on public.construction_plan_files for each row execute function public.validate_construction_child_refs();
drop trigger if exists validate_construction_measurements_refs_insert_update on public.construction_measurements;
create trigger validate_construction_measurements_refs_insert_update before insert or update on public.construction_measurements for each row execute function public.validate_construction_child_refs();
drop trigger if exists validate_construction_material_items_refs_insert_update on public.construction_material_items;
create trigger validate_construction_material_items_refs_insert_update before insert or update on public.construction_material_items for each row execute function public.validate_construction_child_refs();
drop trigger if exists validate_construction_annotations_refs_insert_update on public.construction_annotations;
create trigger validate_construction_annotations_refs_insert_update before insert or update on public.construction_annotations for each row execute function public.validate_construction_child_refs();
drop trigger if exists validate_construction_scope_sections_refs_insert_update on public.construction_scope_sections;
create trigger validate_construction_scope_sections_refs_insert_update before insert or update on public.construction_scope_sections for each row execute function public.validate_construction_child_refs();
drop trigger if exists validate_construction_crew_instructions_refs_insert_update on public.construction_crew_instructions;
create trigger validate_construction_crew_instructions_refs_insert_update before insert or update on public.construction_crew_instructions for each row execute function public.validate_construction_child_refs();
drop trigger if exists validate_construction_export_records_refs_insert_update on public.construction_export_records;
create trigger validate_construction_export_records_refs_insert_update before insert or update on public.construction_export_records for each row execute function public.validate_construction_child_refs();

alter table public.construction_projects enable row level security;
alter table public.construction_plan_files enable row level security;
alter table public.construction_measurements enable row level security;
alter table public.construction_material_templates enable row level security;
alter table public.construction_material_items enable row level security;
alter table public.construction_annotations enable row level security;
alter table public.construction_scope_sections enable row level security;
alter table public.construction_crew_instructions enable row level security;
alter table public.construction_export_records enable row level security;

drop policy if exists "Users manage own construction projects" on public.construction_projects;
create policy "Users manage own construction projects" on public.construction_projects for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "Users manage own construction plan files" on public.construction_plan_files;
create policy "Users manage own construction plan files" on public.construction_plan_files for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "Users manage own construction measurements" on public.construction_measurements;
create policy "Users manage own construction measurements" on public.construction_measurements for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "Users manage construction material templates" on public.construction_material_templates;
create policy "Users manage construction material templates" on public.construction_material_templates for all to authenticated using(is_system or user_id=auth.uid()) with check((not is_system) and user_id=auth.uid());
drop policy if exists "Users manage own construction material items" on public.construction_material_items;
create policy "Users manage own construction material items" on public.construction_material_items for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "Users manage own construction annotations" on public.construction_annotations;
create policy "Users manage own construction annotations" on public.construction_annotations for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "Users manage own construction scope sections" on public.construction_scope_sections;
create policy "Users manage own construction scope sections" on public.construction_scope_sections for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "Users manage own construction crew instructions" on public.construction_crew_instructions;
create policy "Users manage own construction crew instructions" on public.construction_crew_instructions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "Users manage own construction export records" on public.construction_export_records;
create policy "Users manage own construction export records" on public.construction_export_records for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

insert into storage.buckets(id,name,public) values('alma-construction','alma-construction',false) on conflict(id) do update set public=false;
drop policy if exists "Users manage own alma construction files" on storage.objects;
create policy "Users manage own alma construction files" on storage.objects for all to authenticated using(bucket_id='alma-construction' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='alma-construction' and (storage.foldername(name))[1]=auth.uid()::text);

commit;
