# Architecture

ALMA is a Next.js control plane backed by Supabase Auth, Postgres, Storage, and
RLS. Workspace membership is the tenant boundary. Server-only repositories
perform privileged provider and background-job mutations.

Canonical domains:

- Customers: `contacts`, `companies`, opportunities and activity.
- Work: tasks, planner, appointments, notes, and approvals.
- Money: invoices, estimates, business transactions, receipts, payroll
  preparation, tax-readiness checklists, and reports.
- Inbox: channel-neutral communication threads and messages.
- Providers: encrypted `provider_connections` and secrets.
- AI: one metered execution boundary with entitlements, reservations,
  settlement, idempotency, and approvals.

Legacy creative/Builder code is retained only for migration compatibility and
is excluded from the active module registry and production navigation.
