# Construction Blueprint Beta Audit

## Release Scope

Construction Blueprint Beta is the ALMA workspace at `/construction` for manual project takeoff and crew documentation. It includes:

- Construction project list, create, edit, archive/delete.
- Optional owned CRM contact/company links.
- Private plan/photo upload with signed preview and download.
- Manual measurements for linear, area, volume, perimeter, and count.
- Image annotation references with normalized coordinates.
- Material estimates from editable factors and manual overrides.
- Ordered scope sections.
- Crew checklist, sequence, safety note, assigned crew text, and explicit one-time Task/Planner actions.
- Private server-generated PDF summary export with signed download history.

Excluded from this Beta:

- AI takeoff, OCR, scale detection, automatic measurement recognition, supplier pricing, purchasing, engineering/code approval, CAD, BIM, payroll, GPS, live collaboration, offline sync.

## Commit Chain

- Product specification: `9096218 docs(alma): specify Construction Blueprint MVP`
- P6-A foundation: `9d9b5a0 feat(alma): add Construction workspace foundation`
- P6-B project workspace: `f1f63bf feat(alma): add Construction project workspace`
- P6-C plans and measurements: `bfb2dfd feat(alma): add Construction plans and measurements`
- P6-D annotations: `0f36bd8 feat(alma): add Construction plan annotations`
- P6-E materials, scope, crew: `f0547c5 feat(alma): add Construction scope and crew workflow`
- P6-F PDF export: `7f6abb4 feat(alma): add Construction project PDF export`

## Migration And Storage

Canonical migration:

- `supabase/migrations/20260715018000_alma_construction_workspace.sql`

Storage bucket:

- `alma-construction`
- Private bucket only.
- Plan/photo path: `{user_id}/{project_id}/plans/{uuid}-{safe_filename}`
- Export path: `{user_id}/{project_id}/exports/{uuid}-{safe_filename}`

Required migration order:

1. Existing base auth/profile/database migrations.
2. CRM and Documents migrations, because Construction can reference owned contacts, companies, and optional documents.
3. `20260715018000_alma_construction_workspace.sql`

Dry run:

```powershell
npx supabase db push --linked --dry-run
```

Apply:

```powershell
npx supabase db push --linked
```

Verify linked migration state:

```powershell
npx supabase migration list --linked
```

Storage verification:

- Confirm `alma-construction` exists.
- Confirm `public=false`.
- Confirm storage object policy limits access to `(storage.foldername(name))[1] = auth.uid()::text`.
- Upload a test image/PDF through `/construction`.
- Confirm direct public object URL does not work.
- Confirm signed preview/download URLs expire after the short-lived window.

## API Inventory

Project:

- `GET /api/construction/projects`
- `POST /api/construction/projects`
- `GET /api/construction/projects/[id]`
- `PATCH /api/construction/projects/[id]`
- `DELETE /api/construction/projects/[id]?confirm=delete`

Files:

- `GET /api/construction/projects/[id]/files`
- `POST /api/construction/projects/[id]/files`
- `GET /api/construction/files/[fileId]?mode=preview|download`
- `DELETE /api/construction/files/[fileId]?confirm=delete`

Measurements:

- `GET /api/construction/projects/[id]/measurements`
- `POST /api/construction/projects/[id]/measurements`
- `PATCH /api/construction/measurements/[measurementId]`
- `DELETE /api/construction/measurements/[measurementId]?confirm=delete`

Annotations:

- `GET /api/construction/projects/[id]/annotations`
- `POST /api/construction/projects/[id]/annotations`
- `PATCH /api/construction/annotations/[annotationId]`
- `DELETE /api/construction/annotations/[annotationId]?confirm=delete`

Materials:

- `GET /api/construction/projects/[id]/materials`
- `POST /api/construction/projects/[id]/materials`
- `PATCH /api/construction/materials/[materialId]`
- `DELETE /api/construction/materials/[materialId]?confirm=delete`

Scope, crew, summary, export:

- `GET /api/construction/projects/[id]/scope`
- `PUT /api/construction/projects/[id]/scope`
- `GET /api/construction/projects/[id]/crew-instructions`
- `PUT /api/construction/projects/[id]/crew-instructions`
- `GET /api/construction/projects/[id]/summary`
- `GET /api/construction/projects/[id]/exports`
- `POST /api/construction/projects/[id]/exports/pdf`
- `GET /api/construction/projects/[id]/exports/[exportId]/download`

## Security Model

- Every Construction table has `user_id`.
- RLS policies restrict rows to the authenticated owner.
- Repository methods repeat ownership checks server-side.
- Child records validate parent project ownership through repository checks and database triggers.
- CRM contact/company links are accepted only if owned by the authenticated user.
- Optional document references are accepted only if owned by the authenticated user.
- File upload validates MIME type and size.
- File and export downloads return signed URLs only.
- No `getPublicUrl` path is used for Construction storage.
- Export generation reads only owned project data and owned private storage files.
- Errors return safe messages through route helpers; raw Supabase/storage/PDF errors are not returned to users.

## Formula Checks

Local deterministic checks cover:

- Linear, area, volume, perimeter, and count formulas.
- Unit conversion for inches, square yards, and cubic yards.
- Waste adjustment.
- Invalid/negative/NaN/Infinity rejection.
- Material calculation, waste factor, manual override, and incompatible measurement source rejection.
- Summary material totals grouped by unit, without incompatible grand totals.
- PDF renderer uses persisted summary values.

Run:

```powershell
node scripts/check-construction-plans-measurements.mjs
node scripts/check-construction-scope-crew.mjs
node scripts/check-construction-pdf-export.mjs
```

## Two-User RLS Test Plan

Use two real authenticated users in staging.

1. User A creates a Construction project. User B must not see it in `GET /api/construction/projects`.
2. User B requests `GET /api/construction/projects/{userAProjectId}` and receives not found/unauthorized-safe response.
3. User A attempts to link User B contact/company/document IDs. The request must fail.
4. User B attempts to preview/download User A file ID. The request must fail and no signed URL is returned.
5. User B attempts to create an annotation/material/crew item referencing User A file, measurement, or material IDs. The request must fail.
6. User B attempts to generate or download User A export. The request must fail and no signed URL is returned.
7. User A deletes a Construction project. Linked canonical CRM records must remain.
8. User A clicks Create Task/Add to Planner from Crew. Records must be created only under User A.
9. Signed URLs should be short-lived and not permanent public URLs.

## PDF Live Test

1. Create a project with contact/company/jobsite/description.
2. Upload one image and one PDF.
3. Add at least one measurement of each type.
4. Add materials with a linked measurement, waste factor, and manual override.
5. Add scope and crew instructions.
6. Generate PDF from Preview.
7. Download through signed URL.
8. Generate again with the same day idempotency key and confirm it reuses the completed export.
9. Open the PDF and verify no clipped tables, page numbers exist, disclaimers are present, and values match the persisted UI.

## Mobile Manual Test Checklist

Viewport: 390px wide.

- Project list cards wrap and do not cause page-level horizontal scroll.
- Project create/edit sheet fits and has reachable actions.
- Workflow step nav scrolls horizontally only inside the tab row.
- Plan upload/cards fit.
- Measurement form/cards fit.
- Annotation controls fit and image preview remains contained.
- Materials cards and focused form fit.
- Scope editor sheet preserves draft on failed save.
- Crew checklist and text panels fit.
- Preview/export Generate and Download actions remain reachable.
- Marketplace Construction card fits.
- AlmaShell mobile drawer highlights Construction and closes on navigation.

If browser tooling is unavailable, complete this checklist manually before production release approval.

## Rollback

- Revert the P6-A through P6-G commits in reverse order for code rollback.
- If the migration has been applied, do not drop tables casually in production. Disable navigation/Marketplace access first, preserve storage objects, and plan a data-safe archival migration.
- Export records and storage objects are user-owned and private; do not delete user files without a retention decision.

## Limitations

- Beta release.
- Estimates only.
- Verify all field measurements.
- Not engineering, architectural, or code-compliance approval.
- Not an automated professional takeoff.
- Quantity and waste assumptions may vary.
- User remains responsible for final verification.
- PDF image embedding is best-effort for owned PNG/JPEG uploads; PDFs are listed as private file references.

## Beta Readiness Decision

Status: Ready for staged Beta review after live Supabase two-user, storage, PDF, and mobile smoke tests pass.

This audit does not record a migration apply, deployment, or production launch.
