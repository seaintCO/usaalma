# ALMA mobile launch plans

The App Store download should be free. That is separate from ALMA workspace entitlements.

## Recommended launch structure

### Free workspace

Purpose: let a business experience useful ALMA organization without generating provider cost.

- One owner and one workspace.
- Contacts/customers and notes.
- Basic tasks and appointments.
- Manual income and expense tracking.
- Three draft invoices or estimates per month.
- Bilingual interface.
- Small private document allowance.
- No generative AI, voice generation, document AI extraction, external automated sends, Builder, or provider-funded automation.

This tier must use deterministic database, rules, templates, calculations, filtering, and exports only. The exact limits require server-side entitlement constants and tests before public advertising; the mobile binary must not invent a free entitlement the production backend does not enforce.

### ALMA Office

Suggested web price: approximately $39–$40/month.

- Complete non-AI business office.
- CRM, customers, Inbox, tasks, calendar, estimates, invoices, payment tracking, expenses, receipts, documents, reports, payroll preparation, tax/accountant preparation, and rule-based automations.
- Provider connectors where configured.
- No hidden AI calls.

### ALMA AI

Suggested web price: approximately $199/month.

- Everything in Office.
- Metered AI assistant, drafting, summaries, supported extraction, voice, and approval-controlled automation.
- Existing server-side usage reservation/settlement remains the source of truth.
- Customer-facing units are replies, actions, documents, voice minutes, and workflow runs—not raw tokens.

## iPhone monetization decision

Version 1.0 is a free companion app with no external digital-subscription purchase CTA. Existing ALMA customers sign in. If ALMA later sells Office or AI directly in iOS, add App Store auto-renewable subscriptions and reconcile StoreKit transactions into the same canonical workspace entitlement system before exposing purchase buttons.
