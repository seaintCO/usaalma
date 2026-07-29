# Launch checklist

- [ ] Apply all migrations to staging, then production.
- [ ] Configure Supabase, Stripe, app URL, and encryption secrets.
- [ ] Create $39 Office and $199 AI recurring Stripe prices.
- [ ] Register and verify the Stripe webhook.
- [ ] Verify sign-up, onboarding, billing, cancellation, and recovery.
- [ ] Confirm Office produces zero AI provider calls.
- [ ] Verify customer, inbox, work, money, report, and approval workflows.
- [ ] Test receipt storage and financial exports.
- [ ] Test QuickBooks sandbox OAuth or leave it visibly disconnected.
- [ ] Verify English and Spanish on desktop and mobile.
- [ ] Test two unrelated workspaces for isolation.
- [ ] Review audit logs and high-risk approval policies.
- [ ] Confirm legacy modules redirect to the dashboard.
- [ ] Run the release checks in `TESTING.md`.
- [ ] Take a database backup and record rollback steps.
