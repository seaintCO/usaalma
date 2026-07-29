# ALMA Bookkeeping Office

## Product boundary

ALMA is a bookkeeping preparation and financial organization system. It is not
a bank, payroll processor, tax filing service, CPA, or substitute for licensed
financial advice. Confirmed financial records are not silently changed by AI.

## Implemented workflows

The Money workspace now provides real, workspace-owned interfaces for:

- transaction entry and review;
- income, expense, transfer, refund, owner contribution, and owner draw
  classification;
- receipt image or PDF upload, metadata, transaction matching, review, and
  deletion;
- estimates, invoices, payment tracking, and invoice aging;
- employee and contractor records;
- pay-period preparation, hours, overtime, bonuses, reimbursements, prepared
  gross pay, review, and approval;
- annual and quarterly tax-readiness checklists;
- profit-and-loss preparation, cash-flow, invoice-aging, and readiness reports;
- transactions, P&L preparation, and contractor CSV exports.

All arithmetic, filters, reports, CSV files, and readiness calculations are
deterministic. These workflows do not call a language model.

## Financial semantics

ALMA keeps these concepts separate:

- collected payments;
- invoiced revenue;
- posted income;
- expenses;
- internal transfers;
- refunds;
- owner contributions;
- owner draws.

An inflow is not automatically treated as income. Ambiguous activity remains in
review until a user confirms it.

## QuickBooks

The repository contains the QuickBooks OAuth connector foundation, encrypted
token storage, refresh handling, connection status, and safe disconnect
behavior. The bookkeeping export center works without QuickBooks.

Do not market the current build as fully synchronized with QuickBooks until a
live sandbox test verifies entity mapping, conflict review, retry/idempotency,
and sync logs for the selected entities. Missing QuickBooks credentials must
show a disconnected state, never a fake connection.

## Required migration

Apply migrations in filename order through an authorized Supabase process. The
new bookkeeping and voice completion migration is:

`supabase/migrations/20260729001000_alma_bookkeeping_voice_agents.sql`

It is additive and does not reset existing user data.

## Launch verification

Before production:

1. Apply the migration to a non-production Supabase project.
2. Create a customer, transaction, receipt, worker, pay period, and pay entry.
3. Confirm tax checklist persistence after refresh.
4. Export every CSV and reconcile totals against source rows.
5. Verify users cannot read or mutate another workspace.
6. Confirm receipt objects are private and signed/download authorization is
   workspace-scoped.
7. Have an accountant review report naming and exported fields.
