# ALMA Business Launch

## Purpose

Business Launch is a bilingual, workspace-scoped organizer for establishing a
U.S. business. It helps an owner understand and record the work without
presenting ALMA as a lawyer, tax adviser, accountant, registered agent, or
government filing service.

ALMA prepares and tracks the launch. The owner performs government submissions
and fee payments on official portals unless a separately reviewed filing
provider is connected in a future release.

## Customer workflow

1. Choose the formation state, tentative structure, desired name, owners,
   location, industry, and activity.
2. Review the structure, name, and registered-agent decisions.
3. Open official guidance and the appropriate state filing path.
4. Record submission and approval separately.
5. Apply for the free IRS EIN after legal formation when required.
6. Review state/local taxes, licenses, banking, insurance, and accounting.
7. Save confirmed recurring compliance dates.
8. Print a launch packet for the owner or professional adviser.

The seeded checklist has 14 tasks across Foundation, State registration, Tax
IDs, Open for business, and Ongoing compliance.

## Safety boundary

- No automatic state or federal filing is claimed.
- No legal, tax, or accounting recommendation is generated.
- A checklist or submitted filing never marks an entity legally formed.
- ALMA stores only the last four EIN digits, never the complete EIN.
- ALMA does not accept SSNs, identity documents, government passwords, payment
  cards, or registered-agent credentials.
- User-created external references must be HTTPS URLs on `.gov` hosts.
- State fees and deadlines are not hard-coded because they change by
  jurisdiction and circumstance.
- The current BOI card sends the owner to FinCEN and includes a dated notice
  rather than a permanent compliance conclusion.

## Architecture

- UI: `/business-launch`
- API: `GET|POST|PATCH /api/business-launch`
- Tables:
  - `business_launch_projects`
  - `business_launch_tasks`
  - `business_compliance_deadlines`
- Migration:
  `supabase/migrations/20260729002000_alma_business_launch_center.sql`

All records are scoped to the authenticated owner and optional workspace. The
route requires workspace-owner access for a shared workspace. RLS repeats that
owner-only boundary. Tasks are seeded by a database trigger, and all writes use
allowlisted fields and status values.

## Official sources

- SBA launch guide: <https://www.sba.gov/business-guide/launch-your-business>
- SBA registration guide:
  <https://www.sba.gov/business-guide/launch-your-business/register-your-business>
- IRS EIN:
  <https://www.irs.gov/businesses/employer-identification-number>
- FinCEN BOI: <https://www.fincen.gov/boi>

Official requirements should be rechecked before every release and displayed
with a last-reviewed date when summarized in product copy.

## Release steps

1. Apply the migration to staging.
2. Run `npm run business-launch:check`.
3. Sign in as a personal user and create/update a complete launch plan.
4. Sign in as a workspace owner and repeat.
5. Confirm a non-owner cannot create or update a workspace launch plan.
6. Verify EN/ES, mobile layout, printing, and official links.
7. Apply the migration to production only after staging passes.

No new provider credential or environment variable is required for the guided
official-portal release.
