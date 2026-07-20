begin;

alter table public.builder_projects add column if not exists starter_key text
  check (starter_key is null or starter_key in ('landing_page','booking_website','client_portal','internal_dashboard'));
alter table public.builder_projects add column if not exists preview_expires_at timestamptz;
alter table public.builder_projects add column if not exists github_owner text;
alter table public.builder_projects add column if not exists github_repository text;
alter table public.builder_projects add column if not exists github_commit_sha text;
alter table public.builder_projects add column if not exists build_requested_at timestamptz;

alter table public.builder_sessions add column if not exists sandbox_id text;
alter table public.builder_sessions add column if not exists sandbox_domain text;
alter table public.builder_sessions add column if not exists preview_url text;
alter table public.builder_sessions add column if not exists preview_expires_at timestamptz;

alter table public.builder_jobs add column if not exists lease_owner text;
alter table public.builder_jobs add column if not exists lease_expires_at timestamptz;
alter table public.builder_jobs add column if not exists cancel_requested_at timestamptz;
alter table public.builder_jobs add column if not exists last_heartbeat_at timestamptz;

alter table public.builder_jobs drop constraint if exists builder_jobs_status_check;
alter table public.builder_jobs add constraint builder_jobs_status_check
  check (status in ('queued','leased','running','validating','preview_starting','preview_ready','awaiting_approval','completed','retryable_failed','permanently_failed','cancelled','expired'));

alter table public.builder_jobs drop constraint if exists builder_jobs_job_type_check;
alter table public.builder_jobs add constraint builder_jobs_job_type_check
  check (job_type in ('provision_workspace','run_coding_agent','validate_project','publish_preview','deploy_project','build_application','push_to_github'));

alter table public.builder_sessions drop constraint if exists builder_sessions_status_check;
alter table public.builder_sessions add constraint builder_sessions_status_check
  check (status in ('requested','blocked','provisioning','active','completed','failed','cancelled'));

alter table public.provider_connections drop constraint if exists provider_connections_provider_check;
alter table public.provider_connections add constraint provider_connections_provider_check
  check (provider in ('gmail','outlook','quickbooks','stripe_connect','whatsapp_business','github_app'));

alter table public.provider_connection_secrets drop constraint if exists provider_connection_secrets_provider_check;
alter table public.provider_connection_secrets add constraint provider_connection_secrets_provider_check
  check (provider in ('gmail','outlook','quickbooks','stripe_connect','whatsapp_business','github_app'));

create unique index if not exists builder_jobs_one_active_project_idx
  on public.builder_jobs(project_id)
  where status in ('queued','leased','running','validating','preview_starting');

create index if not exists builder_jobs_claim_idx
  on public.builder_jobs(status, lease_expires_at, scheduled_at);

create or replace function public.alma_claim_builder_job(
  input_worker_id text,
  input_lease_seconds integer default 90
)
returns setof public.builder_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_job public.builder_jobs%rowtype;
begin
  update public.builder_jobs
    set status = 'expired',
        completed_at = now(),
        safe_error_summary = 'Builder job lease expired before completion.',
        updated_at = now()
  where status in ('leased','running','validating','preview_starting')
    and lease_expires_at is not null
    and lease_expires_at < now();

  select *
    into selected_job
  from public.builder_jobs
  where status in ('queued','retryable_failed')
    and scheduled_at <= now()
    and attempt_count < max_attempts
    and not exists (
      select 1 from public.builder_jobs active
      where active.project_id = builder_jobs.project_id
        and active.id <> builder_jobs.id
        and active.status in ('leased','running','validating','preview_starting')
    )
  order by scheduled_at asc, created_at asc
  for update skip locked
  limit 1;

  if not found then
    return;
  end if;

  update public.builder_jobs
    set status = 'leased',
        lease_owner = input_worker_id,
        lease_expires_at = now() + make_interval(secs => input_lease_seconds),
        last_heartbeat_at = now(),
        attempt_count = attempt_count + 1,
        started_at = coalesce(started_at, now()),
        updated_at = now()
  where id = selected_job.id
  returning * into selected_job;

  return next selected_job;
end;
$$;

revoke all on function public.alma_claim_builder_job(text, integer) from public, anon, authenticated;
grant execute on function public.alma_claim_builder_job(text, integer) to service_role;

commit;
