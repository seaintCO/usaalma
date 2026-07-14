# ALMA v0.9 beta release preparation

Status: **NOT READY** until the prerequisite query, staging dry run, staging apply, and staged smoke test all pass. This document is release procedure only; it does not authorize a migration, function deployment, or application deployment.

## Immutable migration order

Apply exactly once, in this order:

1. `20260706000000_alma_app_subscriptions.sql`
2. `20260713000000_alma_agent_foundation.sql`
3. `20260714001000_alma_durable_chat_queue.sql`
4. `20260714002000_alma_tasks_workspace.sql`
5. `20260714003000_alma_notes_workspace.sql`
6. `20260714004000_alma_planner_workspace.sql`
7. `20260714005000_alma_documents_workspace.sql`
8. `20260714006000_alma_fitness_workspace.sql`
9. `20260714007000_alma_crm_workspace.sql`
10. `20260714008000_alma_invoicing_workspace.sql`

The module migrations rely on existing ALMA base tables. Do not use `migration repair` to mark one as applied unless the actual schema has been independently verified.

## Read-only prerequisite checklist SQL

Run this against the staging project before any migration. It reads only catalog metadata.

```sql
-- 1. Every required base table/schema exists.
select n.nspname as schema_name, c.relname as relation_name, c.relkind
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where (n.nspname = 'public' and c.relname in (
  'tasks','notes','planner_tasks','documents','fitness_goals','fitness_food_entries',
  'contacts','invoices','conversations','messages','tool_runs'
)) or (n.nspname = 'auth' and c.relname = 'users') or (n.nspname = 'storage' and c.relname in ('buckets','objects'))
order by 1,2;

-- 2. Required base columns. Every row below must report exists = true.
with expected(schema_name, table_name, column_name) as (values
 ('public','tasks','id'),('public','tasks','user_id'),('public','tasks','title'),('public','tasks','completed'),('public','tasks','created_at'),
 ('public','notes','id'),('public','notes','user_id'),('public','notes','title'),('public','notes','content'),
 ('public','planner_tasks','id'),('public','planner_tasks','user_id'),('public','planner_tasks','title'),('public','planner_tasks','notes'),('public','planner_tasks','task_date'),('public','planner_tasks','task_time'),('public','planner_tasks','category'),('public','planner_tasks','priority'),
 ('public','documents','id'),('public','documents','user_id'),('public','documents','title'),
 ('public','fitness_goals','user_id'),('public','fitness_goals','daily_calories'),('public','fitness_goals','daily_protein'),('public','fitness_goals','water_goal_oz'),
 ('public','fitness_food_entries','user_id'),('public','fitness_food_entries','log_date'),('public','fitness_food_entries','calories'),('public','fitness_food_entries','protein'),('public','fitness_food_entries','carbs'),('public','fitness_food_entries','fat'),
 ('public','contacts','id'),('public','contacts','user_id'),('public','contacts','name'),('public','contacts','email'),('public','contacts','phone'),('public','contacts','company'),('public','contacts','status'),
 ('public','invoices','id'),('public','invoices','user_id'),('public','invoices','client_name'),('public','invoices','amount'),('public','invoices','status'),('public','invoices','created_at'),
 ('public','conversations','id'),('public','conversations','user_id'),
 ('public','messages','id'),('public','messages','user_id'),('public','messages','conversation_id'),('public','messages','role'),('public','messages','content'),
 ('public','tool_runs','id'),('public','tool_runs','user_id'),('public','tool_runs','tool_name'),('public','tool_runs','arguments'),('public','tool_runs','result'),('public','tool_runs','success')
)
select e.*, (c.column_name is not null) as exists
from expected e left join information_schema.columns c on (c.table_schema,c.table_name,c.column_name)=(e.schema_name,e.table_name,e.column_name)
order by e.schema_name,e.table_name,e.column_name;

-- 3. Existing migration history; investigate any mismatch before proceeding.
select version, name, statements from supabase_migrations.schema_migrations order by version;

-- 4. Detect pre-existing constraints/triggers that would conflict with named objects.
select conrelid::regclass as relation_name, conname from pg_constraint
where conname in ('agent_executions_status_check','tasks_priority_check','tasks_status_check','tasks_source_check','notes_source_check','planner_tasks_status_check','documents_type_check','documents_status_check','documents_source_check','contacts_company_fk','invoices_status_check')
order by 1,2;
select tgrelid::regclass as relation_name, tgname from pg_trigger
where not tgisinternal and tgname in ('tasks_updated_at','notes_updated_at','planner_tasks_updated_at','documents_updated_at','contacts_updated_at','companies_updated_at','opportunities_updated_at','invoices_updated_at','invoice_line_items_updated_at')
order by 1,2;
```

Stop if a required table/column is absent, a base column has an incompatible type, or migration history contains an old version that represents a renamed pending migration. Capture the staging schema before making a history repair decision.

## Post-migration verification SQL

Run after a successful staging apply. All statements are read-only.

```sql
-- Applied order must exactly match the release order above.
select version, name from supabase_migrations.schema_migrations
where version in ('20260706000000','20260713000000','20260714001000','20260714002000','20260714003000','20260714004000','20260714005000','20260714006000','20260714007000','20260714008000')
order by version;

-- New columns and their definitions.
select table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns
where table_schema='public' and (
 (table_name='agent_executions' and column_name in ('idempotency_key','user_message_id','queued_at','claim_token','lease_expires_at')) or
 (table_name='messages' and column_name in ('execution_id','status','idempotency_key','updated_at')) or
 (table_name='tool_runs' and column_name in ('execution_id','step_key','idempotency_key')) or
 (table_name='conversations' and column_name in ('last_message_at','updated_at')) or
 (table_name='tasks' and column_name in ('description','priority','status','due_at','completed_at','source','source_execution_id','updated_at')) or
 (table_name='notes' and column_name in ('source','source_execution_id','archived','updated_at')) or
 (table_name='planner_tasks' and column_name in ('task_id','duration_minutes','color','reminder_minutes','recurrence_rule','status','completed_at','updated_at')) or
 (table_name='documents' and column_name in ('document_type','file_name','file_path','mime_type','file_size','status','extracted_text','source','source_execution_id','error_message','updated_at')) or
 (table_name='contacts' and column_name in ('company_id','source','source_execution_id','updated_at')) or
 (table_name='companies' and column_name in ('source','source_execution_id','updated_at')) or
 (table_name='opportunities' and column_name in ('source_execution_id','updated_at')) or
 (table_name='invoices' and column_name in ('invoice_number','client_email','client_phone','billing_address','issue_date','due_date','currency','subtotal','tax_amount','discount_amount','total','source','source_execution_id','sent_at','viewed_at','paid_at','updated_at','duplicate_key')) or
 (table_name='invoice_line_items' and column_name in ('invoice_id','user_id','source_execution_id','idempotency_key'))
) order by table_name,column_name;

-- Constraints, indexes, triggers, RLS, and policies.
select conrelid::regclass as relation_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint where conname in ('agent_executions_status_check','tasks_priority_check','tasks_status_check','tasks_source_check','notes_source_check','planner_tasks_status_check','documents_type_check','documents_status_check','documents_source_check','contacts_company_fk','invoices_status_check') order by 1,2;
select tablename,indexname,indexdef from pg_indexes where schemaname='public' and indexname in ('agent_executions_durable_idempotency_idx','messages_one_assistant_per_execution_idx','messages_user_idempotency_idx','agent_execution_steps_step_key_idx','tool_runs_durable_idempotency_idx','chat_runs_claim_idx','tasks_alma_execution_idx','notes_alma_execution_idx','documents_alma_execution_idx','contacts_alma_execution_idx','companies_alma_execution_idx','opportunities_alma_execution_idx','crm_activities_execution_type_idx','invoices_alma_execution_idx','invoices_duplicate_key_idx','invoice_line_items_idempotency_idx') order by tablename,indexname;
select tgrelid::regclass as relation_name,tgname,pg_get_triggerdef(oid) as definition from pg_trigger where not tgisinternal and tgname in ('assert_agent_execution_durable_ownership','assert_chat_run_durable_ownership','assert_message_durable_ownership','assert_tool_run_durable_ownership','assert_execution_step_durable_ownership','tasks_updated_at','notes_updated_at','planner_tasks_updated_at','documents_updated_at','crm_contacts_ownership','crm_opportunities_ownership','crm_activities_ownership','invoice_line_items_owner') order by 1,2;
select c.relname as table_name,c.relrowsecurity as rls_enabled,p.polname,p.polcmd,pg_get_expr(p.polqual,p.polrelid) as using_expression,pg_get_expr(p.polwithcheck,p.polrelid) as check_expression from pg_class c join pg_namespace n on n.oid=c.relnamespace left join pg_policy p on p.polrelid=c.oid where n.nspname='public' and c.relname in ('chat_runs','conversation_user_state','agent_executions','agent_execution_steps','messages','tool_runs','tasks','notes','planner_tasks','documents','contacts','companies','opportunities','crm_activities','invoices','invoice_line_items') order by c.relname,p.polname;

-- Durable queue RPCs and restricted privileges.
select p.proname,pg_get_function_identity_arguments(p.oid) as args,p.prosecdef,has_function_privilege('authenticated',p.oid,'execute') as authenticated_execute,has_function_privilege('service_role',p.oid,'execute') as service_role_execute from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('claim_chat_run','complete_chat_run','fail_chat_run','assert_durable_chat_ownership');

-- Ownership-validation functions must be installed and use canonical parent checks.
select p.proname,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('assert_durable_chat_ownership','assert_crm_ownership','assert_invoice_line_ownership');

-- Storage bucket and its object policy.
select id,name,public from storage.buckets where id='alma-documents';
select polname,polcmd,pg_get_expr(polqual,polrelid) as using_expression,pg_get_expr(polwithcheck,polrelid) as check_expression from pg_policy where polrelid='storage.objects'::regclass and polname='Users manage own alma documents';
```

## Supabase CLI procedure

Install and authenticate the CLI outside this repository, then link the staging project. The workspace used for this preparation did not have `supabase` installed, so these commands were not executed here.

```powershell
# History comparison before any apply
supabase migration list --linked

# Read-only migration dry run; inspect the printed order.
supabase db push --linked --dry-run

# Apply only after the prerequisite SQL and dry run are approved.
supabase db push --linked

# Verify remote history after apply.
supabase migration list --linked

# Optional direct confirmation for an explicitly supplied staging connection.
supabase migration list --db-url "$env:SUPABASE_DB_URL"
supabase db push --db-url "$env:SUPABASE_DB_URL" --dry-run
```

`db push --dry-run` prints pending migrations without applying them. `migration list` compares local files with remote history. See the [Supabase CLI reference](https://supabase.com/docs/reference/cli/supabase-db-push) and [migration deployment guide](https://supabase.com/docs/guides/deployment/database-migrations).

## Staged smoke test

1. **Tasks:** create/update/complete/cancel one owned task; retry the same durable tool execution and verify a single task.
2. **Notes:** create, edit, archive, search, and retry a chat-created note; verify one source execution row.
3. **Planner:** create linked/unlinked item, edit, complete, cancel, and validate recurrence display.
4. **Documents:** upload/download owned file; confirm bucket path begins with the user ID; cross-user access must be denied.
5. **Fitness:** save goals and food entry; refresh and verify macro aggregation.
6. **CRM:** create/edit/delete contact/company/opportunity; move stage and confirm activity; attempt cross-user parent linking and expect rejection.
7. **Invoicing:** create/edit draft, add/edit/delete line, change tax/discount/due date, verify totals, duplicate once with the same key, run all allowed lifecycle actions, and download PDF.
8. **Durable chat:** submit one run, leave the page, resume it, verify one user message/assistant message/execution/queue row, and verify terminal state.
9. **RLS:** as a second authenticated user, read/mutate the first user’s CRM, invoice, queue, execution, message, document, and storage rows; every operation must be rejected or return no rows.

## Release and rollback order

1. Push the reviewed local commits **before** staging migration deployment, so the exact migration files and application code are immutable and reviewable. Do not deploy application code that depends on these pending columns before the matching migration is applied.
2. Run prerequisite SQL and `supabase migration list --linked` on staging.
3. Run `supabase db push --linked --dry-run`, review the ten-version order, apply to staging, run post-migration SQL and smoke tests.
4. Promote the same commit to production; run the same dry run, apply, post-migration verification, then deploy the application and Edge Function configuration separately.

Rollback is forward-only: do not delete migration history or run `migration repair` as a substitute for schema rollback. If a production issue is found, stop the application rollout, disable durable chat with `ALMA_DURABLE_CHAT_ENABLED=false`, and ship a new additive corrective migration. Restore data from a verified backup only for data-loss incidents.

## Release blockers

- Staging/live prerequisite schema has not been inspected from this workspace.
- Supabase CLI is not installed or linked here.
- No staging migration dry run, migration application, RLS two-user test, or authenticated browser smoke test has been run.
