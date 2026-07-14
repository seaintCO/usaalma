# ALMA module schema and RLS inventory (Stage A1)

Status: source audit complete; live database verification is pending. This document
does not authorize a migration. Run the SQL below in Supabase Studio SQL Editor or
through an approved read-only database connection before Stage A2.

## Read-only live inspection SQL

```sql
-- Columns, defaults, generated values, and nullability.
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'tasks', 'planner_tasks', 'notes', 'documents',
    'fitness_food_entries', 'fitness_goals', 'fitness_favorites',
    'fitness_measurements', 'fitness_water_entries', 'fitness_grocery_lists',
    'contacts', 'companies', 'opportunities', 'crm_notes',
    'invoices', 'invoice_items', 'generated_images', 'creative_assets',
    'creative_folders', 'launch_studio_projects', 'modules',
    'installed_modules', 'app_subscriptions', 'subscriptions', 'profiles',
    'user_preferences'
  )
order by table_name, ordinal_position;

-- Constraints, primary/foreign keys, and uniqueness guarantees.
select tc.table_name, tc.constraint_name, tc.constraint_type,
       kcu.column_name, ccu.table_name as foreign_table_name,
       ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
where tc.table_schema = 'public'
  and tc.table_name in (
    'tasks', 'planner_tasks', 'notes', 'documents',
    'fitness_food_entries', 'fitness_goals', 'fitness_favorites',
    'fitness_measurements', 'fitness_water_entries', 'fitness_grocery_lists',
    'contacts', 'companies', 'opportunities', 'crm_notes',
    'invoices', 'invoice_items', 'generated_images', 'creative_assets',
    'creative_folders', 'launch_studio_projects', 'modules',
    'installed_modules', 'app_subscriptions', 'subscriptions', 'profiles',
    'user_preferences'
  )
order by tc.table_name, tc.constraint_name, kcu.ordinal_position;

-- RLS state and policies. Every user-owned table must have RLS enabled and
-- policies that bind user_id (or its canonical parent) to auth.uid().
select c.relname as table_name, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced, p.polname as policy_name,
       p.polcmd as command, pg_get_expr(p.polqual, p.polrelid) as using_expression,
       pg_get_expr(p.polwithcheck, p.polrelid) as with_check_expression
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relname in (
    'tasks', 'planner_tasks', 'notes', 'documents',
    'fitness_food_entries', 'fitness_goals', 'fitness_favorites',
    'fitness_measurements', 'fitness_water_entries', 'fitness_grocery_lists',
    'contacts', 'companies', 'opportunities', 'crm_notes',
    'invoices', 'invoice_items', 'generated_images', 'creative_assets',
    'creative_folders', 'launch_studio_projects', 'modules',
    'installed_modules', 'app_subscriptions', 'subscriptions', 'profiles',
    'user_preferences'
  )
order by c.relname, p.polname;

-- Indexes supporting owned lists/searches and idempotent writes.
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'tasks', 'planner_tasks', 'notes', 'documents',
    'fitness_food_entries', 'fitness_goals', 'fitness_favorites',
    'fitness_measurements', 'fitness_water_entries', 'fitness_grocery_lists',
    'contacts', 'companies', 'opportunities', 'crm_notes',
    'invoices', 'invoice_items', 'generated_images', 'creative_assets',
    'creative_folders', 'launch_studio_projects', 'modules',
    'installed_modules', 'app_subscriptions', 'subscriptions', 'profiles',
    'user_preferences'
  )
order by tablename, indexname;

-- Private-storage verification for the future Documents upload workflow.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by name;
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'storage'
order by tablename, policyname;
```

## Source-to-schema comparison

| Domain | Source assumptions and callers | Required live columns / ownership proof | Migration coverage and risk |
|---|---|---|---|
| Tasks | `TaskRepository`, `/api/tasks/*`, task tools use `tasks`. | `id`, `user_id`, `title`, `completed`, timestamps; Stage A2 additionally needs description, priority, due date/time, status and owned delete/search indexes. | No checked-in table migration. RLS and canonical relationship to `agent_tasks` unverified. |
| Planner | `/api/planner/add` writes `planner_tasks`; page is local mock data. | `user_id`, title, notes, task_date/time, category, priority, completion/status, timestamps. | No checked-in migration. Source contains no read/update/delete route; RLS unverified. |
| Notes | `NoteRepository`, `/api/notes/*`, note tool use `notes`. | `id`, `user_id`, title, content, created/updated timestamps. | No checked-in migration. Edit/delete/search/index/RLS coverage unknown. |
| Documents | `DocumentRepository` uses `documents` and embeddings; document tool and search route reuse it. | `id`, `user_id`, title, content, source type, embedding, timestamps; later file workflow needs storage path, MIME/type, size, processing status. | No checked-in migration and no storage bucket/policy definition. Do not implement uploads before live inspection. |
| Fitness | V2 page uses food entries/favorites/meal plan; legacy routes coexist. | Each owned table needs `user_id`; food entries require log date/macros; goals, weight, water, favorites and grocery data need explicit schemas. | No checked-in fitness migration. Confirmed API conflict: UI calls missing `/api/fitness/v2/goals`, while `/api/fitness/goals` exists. |
| CRM | Contact repository/routes use `contacts`; tools create contacts/leads. | Contact ownership plus, later, company/opportunity/note/task parent keys. | No checked-in migration. Only contact create/list is source-backed; all expanded CRM entities are unverified. |
| Invoices | Invoice repository uses `invoices`; page has a richer local form than repository persistence. | User/client, number, status, due date, totals and timestamps; line items require parent ownership. | No checked-in migration. Current repository only persists client name/amount/status. |
| Images / Creative | `generated_images`, creative assets/folders and image tools/providers. | Owner ID, prompt, source asset/image, provider request/idempotency key, quality/size, result/state/timestamps. | No checked-in migration. RLS and duplicate-generation constraints must be verified. |
| Launch Studio | Existing route set references saved projects/assets. | Project owner, content JSON, timestamps, optional export/deploy metadata. | No checked-in migration; standalone route currently redirects. |
| Marketplace | `modules`, `installed_modules`; `app_subscriptions` migration exists. | Catalog metadata must be global/read-only; installations must have user ownership and uniqueness. | `20260706_alma_app_subscriptions.sql` covers app subscriptions only, not entire module catalog/connection truth. Demo mode fabricates installed modules. |
| Billing | `subscriptions` repository and Stripe routes. | User ID unique, Stripe customer/subscription IDs, plan, status, period end. | No checked-in subscriptions migration. Verify RLS and webhook-service-role path. |
| Profiles/preferences | Settings API only writes language/ALMA mode today. | User-owned profile, language, timezone, chat/memory preferences, timestamps. | No checked-in migration; actual table names and policy coverage unknown. |

## Repositories and API generations

- Canonical source repositories exist for tasks, notes, documents, contacts,
  invoices, images, modules, subscriptions, and integrations.
- Planner bypasses a repository and writes directly to Supabase.
- Fitness has conflicting legacy and v2 APIs. Stage A6 must select one canonical
  generation; no new fitness storage may be added before that decision.
- `agent_tasks` is an agent execution/scheduling foundation. `tasks` is the
  user workspace currently used by the Tasks UI and task tool. Stage A2 must
  document their explicit linkage rather than merge them blindly.
- The durable-chat migration is excluded from this stage and must not be used
  as a module-data migration.

## Mock/demo-only behavior and status risks

- Planner page seeds three local tasks and never calls its persistence API.
- Marketplace fabricates installed modules under `NEXT_PUBLIC_DEMO_MODE=true`.
- Documents are manual text records, not uploaded files.
- Billing and Settings are placeholder pages.
- Trader standalone page returns not-found; its dashboard panel/API presence is
  not a production-ready workspace.
- `NEXT_PUBLIC_DEMO_MODE` and `NEXT_PUBLIC_BETA_MODE` alter production truth and
  must never be enabled for a truthful production status surface.

## Recommended first implementation migration (do not create yet)

After the read-only inspection proves exact current schema, Stage A2 should use
one additive, transactional, idempotent migration that extends the existing
`tasks` table only if the required fields are absent:

- `description`, `priority`, `due_at`, `status`, `completed_at`, `updated_at`
- an owned `(user_id, status, due_at)` index and an owned search index suited to
  the verified database capabilities
- RLS policies for select/insert/update/delete binding `user_id = auth.uid()`
- no new task table and no changes to `agent_tasks`

The migration must be withheld until the live query confirms whether equivalent
columns, indexes, and policies already exist.
