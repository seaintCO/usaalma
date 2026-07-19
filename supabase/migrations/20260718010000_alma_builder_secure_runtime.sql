begin;

create extension if not exists pgcrypto;

create table if not exists public.builder_gateway_tokens (
  id uuid primary key default gen_random_uuid(),
  token_id text not null unique,
  token_hash text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.builder_projects(id) on delete cascade,
  session_id uuid references public.builder_sessions(id) on delete set null,
  job_id uuid not null references public.builder_jobs(id) on delete cascade,
  sandbox_id text not null,
  model text not null,
  audience text not null,
  issuer text not null,
  request_count integer not null default 0 check(request_count >= 0),
  token_count integer not null default 0 check(token_count >= 0),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  safe_failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.builder_projects add column if not exists builder_project_dir text;
alter table public.builder_projects add column if not exists starter_manifest_sha256 text;

create index if not exists builder_gateway_tokens_job_idx on public.builder_gateway_tokens(job_id, expires_at);
create index if not exists builder_gateway_tokens_revoked_idx on public.builder_gateway_tokens(revoked_at) where revoked_at is null;

drop trigger if exists builder_gateway_tokens_updated_at on public.builder_gateway_tokens;
create trigger builder_gateway_tokens_updated_at before update on public.builder_gateway_tokens for each row execute function public.alma_set_updated_at();

alter table public.builder_gateway_tokens enable row level security;
revoke all on public.builder_gateway_tokens from anon, authenticated;

insert into storage.buckets(id,name,public)
values('alma-builder-artifacts','alma-builder-artifacts',false)
on conflict(id) do update set public=false;

drop policy if exists "Service role manages alma builder artifacts" on storage.objects;
create policy "Service role manages alma builder artifacts" on storage.objects for all to service_role
using(bucket_id='alma-builder-artifacts')
with check(bucket_id='alma-builder-artifacts');

commit;
