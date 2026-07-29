# Database

Run additive migrations in timestamp order. The business-office migration is:

`supabase/migrations/20260728001000_alma_business_office_refocus.sql`

It adds profiles, transactions, receipts, appointments, payroll preparation,
tax checklists, QuickBooks connection/sync records, autonomy settings, indexes,
constraints, timestamp triggers, RLS, and a private receipt bucket.

The migration does not drop existing tables or reset user data. Existing CRM,
invoice, estimate, task, communication, subscription, approval, audit, and AI
usage stores remain canonical. Before production, test migrations against a
restored staging snapshot and verify RLS with two unrelated workspaces.
