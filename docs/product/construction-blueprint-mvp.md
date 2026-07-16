# Construction Blueprint / Takeoff Sender MVP

## Purpose

The Construction Blueprint MVP is a lightweight, mobile-first workspace for contractors and crew leaders who need to turn plans, photos, measurements, and job notes into clear field instructions and a professional PDF summary.

It is not a Bluebeam, Procore, PlanSwift, engineering, permitting, or automated takeoff replacement. The MVP helps users organize and communicate their own measurements; it does not interpret plans automatically or certify accuracy.

## Recommendation: ALMA Workspace

Recommended placement: **ALMA workspace at `/construction`**.

Rationale:

| Factor               | ALMA Workspace                                                                                                        | Separate Altamira Construction Product                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Target customer      | Fits existing small-business operator workflows already represented by CRM, Documents, Tasks, Planner, and Invoicing. | Could be marketed more directly to trades, but would require separate onboarding and positioning. |
| Pricing              | Natural as a paid workspace/module, possibly Beta first.                                                              | Could support trade-specific pricing later, but heavier to launch.                                |
| Field/mobile usage   | ALMA shell already supports mobile workspace navigation and EN/ES.                                                    | A separate field app could be more specialized later.                                             |
| Brand positioning    | Reinforces ALMA as an AI operating system for real work, without claiming automated estimating.                       | Stronger niche construction brand, but fragments product story now.                               |
| Future expansion     | Can later graduate to an Altamira-branded vertical if traction proves strong.                                         | Better for a mature standalone suite, not the MVP.                                                |
| Data model           | Reuses canonical CRM, Documents, Tasks, Planner, Invoicing ownership boundaries.                                      | Risks duplicating CRM/project/customer records.                                                   |
| Implementation speed | Fastest path because auth, shell, modules, storage, PDF dependencies, and routes already exist.                       | Slower due to separate brand, navigation, billing, and support surfaces.                          |
| Sales strategy       | Sell as "ALMA Construction Beta" to existing small-business users and contractors.                                    | Better for outbound vertical sales later.                                                         |

Decision: build as an ALMA workspace first, with data boundaries clean enough that a separate Altamira Construction product could reuse the same internal architecture later.

## Primary Users and Workflows

### Masonry Contractors

- Create a project for a wall, chimney, repair, patio, or veneer job.
- Upload plan pages or jobsite photos.
- Enter wall dimensions and openings manually.
- Calculate area, block/brick assumptions, mortar estimates, and waste.
- Export a PDF for customer review or crew instructions.

### Chimney Crews

- Attach photos of existing chimney conditions.
- Record face dimensions, cap dimensions, flue component counts, and repair notes.
- Mark plan/photo pins for cracked crown, flashing, brick damage, or access concerns.
- Send a crew-ready scope summary.

### Remodelers

- Collect customer/jobsite details.
- Upload sketches, plans, or site photos.
- Capture room measurements and scope notes.
- Prepare a concise PDF summary for internal handoff or customer discussion.

### Roofing Crews

- Upload roof photos or plan sheets.
- Enter simple roof areas, waste factor, squares, bundles, and underlayment assumptions.
- Add access, staging, weather, and disposal notes.

### Flooring Crews

- Capture room measurements, square footage, waste, and box/unit assumptions.
- Attach before photos and layout notes.
- Export a clean install summary.

### Field Supervisors, Small Estimators, and Crew Leaders

- Keep all plan/photo references and user-entered quantities in one project.
- Build crew checklists and work sequence notes.
- Create tasks or planner items from the project without duplicating task/planner tables.
- Produce a professional shareable PDF.

## Information Architecture

Required screens:

1. **Projects**: searchable project cards, status filters, archive access.
2. **New Project**: project name, customer/company link, jobsite, type, description.
3. **Project Overview**: status, customer/jobsite summary, recent files, measurement totals, next action.
4. **Plans and Photos**: upload, preview, download, notes, delete.
5. **Measurements**: manual calculator entries, formulas, waste, totals.
6. **Materials**: template selection, editable factors, material summary.
7. **Scope Notes**: included work, exclusions, assumptions, material notes, access/site notes, customer notes.
8. **Crew Instructions**: checklist, sequence, safety notes entered by user, assigned crew text.
9. **Preview**: PDF preview with selected project sections.
10. **Export / Share**: generate PDF, download, optional email only through an already verified provider.

Mobile requirements:

- One step visible at a time.
- Step progress with clear next/back controls.
- Large touch targets, about 44px minimum.
- Camera/photo upload.
- Compact project cards.
- Designed upload zones and mobile-safe forms.
- No horizontal page scrolling.
- No desktop tables on phone.
- Usable outdoors: high contrast, low visual clutter, persistent primary action.

Desktop behavior:

- Left project navigation or step rail.
- Center active workspace.
- Optional right summary/actions panel.
- Week/day-style density is acceptable for project summaries, but mobile remains step-first.

## Project Model

Table: `construction_projects`

Fields:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `project_name text not null`
- `contact_id uuid null references contacts(id) on delete set null`
- `company_id uuid null references companies(id) on delete set null`
- `jobsite_address text`
- `project_type text not null`
- `status text not null default 'draft'`
- `description text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `archived_at timestamptz`

Project types:

- `masonry`
- `chimney`
- `wall`
- `floor`
- `roof`
- `deck`
- `fence`
- `remodel`
- `custom`

Statuses:

- `draft`
- `active`
- `ready_to_send`
- `sent`
- `archived`

Rules:

- Reuse canonical CRM `contacts` and `companies` where safe.
- Do not duplicate CRM customer/company tables.
- Cross-table CRM links must verify the linked contact/company belongs to the same user.

## Plan / Photo Model

Table: `construction_plan_files`

Supported uploads:

- PDF
- PNG
- JPG/JPEG
- Phone-camera photos

Fields:

- `id uuid primary key default gen_random_uuid()`
- `project_id uuid not null references construction_projects(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `document_id uuid null references documents(id) on delete set null`
- `storage_path text not null`
- `original_filename text not null`
- `mime_type text not null`
- `size_bytes bigint not null`
- `page_count integer`
- `image_width integer`
- `image_height integer`
- `title text not null`
- `notes text`
- `created_at timestamptz not null default now()`

Requirements:

- Private storage only.
- Owner-only access.
- Signed previews/downloads.
- No permanent public URL.
- No OCR.
- No automatic scale detection.
- No automatic blueprint interpretation.
- Preserve original uploaded file.

Canonical Documents evaluation:

- Create a canonical `documents` record only when the upload is useful as general ALMA knowledge or when the user explicitly selects "Also save to Documents."
- Default construction uploads should live in `construction_plan_files` with optional `document_id`.
- Avoid polluting Documents with large jobsite photos that are not reusable knowledge.

## Measurement Model

Table: `construction_measurements`

Fields:

- `id uuid primary key default gen_random_uuid()`
- `project_id uuid not null references construction_projects(id) on delete cascade`
- `plan_file_id uuid null references construction_plan_files(id) on delete set null`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `measurement_type text not null`
- `label text not null`
- `length numeric`
- `width numeric`
- `height_or_depth numeric`
- `quantity numeric not null default 1`
- `unit text not null`
- `waste_percentage numeric not null default 0`
- `notes text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Measurement types:

- `linear`
- `area`
- `volume`
- `perimeter`
- `count`

Units:

- `feet`
- `inches`
- `square_feet`
- `cubic_feet`
- `yards`
- `square_yards`
- `cubic_yards`
- `each`

Formulas:

- Linear: `total = length * quantity`
- Area: `total = length * width * quantity`
- Volume: `total = length * width * height_or_depth * quantity`
- Perimeter: `total = 2 * (length + width) * quantity`
- Count: `total = quantity`
- Waste-adjusted: `adjusted_total = total * (1 + waste_percentage / 100)`

Unit conversion:

- Store user-entered unit and normalized calculated totals.
- Convert inches to feet for linear calculations when combining feet/inches.
- Convert square yards to square feet with `1 square yard = 9 square feet`.
- Convert cubic yards to cubic feet with `1 cubic yard = 27 cubic feet`.
- Do not combine incompatible units without explicit conversion.

Rounding and precision:

- Store calculated numeric totals to 4 decimal places.
- Display measurement totals to 2 decimal places.
- Display material counts as rounded-up whole quantities where partial units are not meaningful.
- Label all rounded values as estimates.
- Never imply automated precision from uploaded files.

Validation:

- Required: `measurement_type`, `label`, `unit`, `quantity`.
- `quantity` must be greater than 0.
- Dimensions must be greater than 0 when required by type.
- Waste percentage range: `0` to `100`.
- Reject negative values.
- Warn, but allow, high waste factors after confirmation.

## Material Calculation Model

Tables:

- `construction_material_templates`
- `construction_material_items`

Template architecture:

- Templates are reusable, user-owned or system-default.
- System defaults are read-only seeds.
- User copies can be edited per project.
- Each template contains calculation factors and display labels.
- Project-level material summaries reference measurements and template items.

`construction_material_templates` fields:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid null references auth.users(id) on delete cascade`
- `name text not null`
- `trade_type text not null`
- `is_system boolean not null default false`
- `description text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

`construction_material_items` fields:

- `id uuid primary key default gen_random_uuid()`
- `template_id uuid not null references construction_material_templates(id) on delete cascade`
- `label text not null`
- `input_measurement_type text not null`
- `output_unit text not null`
- `conversion_factor numeric not null`
- `rounding_rule text not null default 'none'`
- `notes text`
- `sort_order integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Editable templates:

### Masonry

- Block or brick per square foot.
- Mortar bags per block/brick count.
- Sand factor.
- Concrete factor.

### Chimney

- Face area.
- Brick/block quantity.
- Flue components as manual counts.
- Cap area/volume.

### Floor

- Square footage.
- Boxes/units.
- Waste percentage.

### Roof

- Area.
- Squares.
- Bundles.
- Underlayment.

### Wall

- Wall area.
- Drywall sheets.
- Studs.
- Paint coverage.

Requirements:

- Conversion factors are user-adjustable.
- Defaults are labeled estimates.
- No supplier pricing.
- No regional-code claims.
- No automated purchasing.
- No fake cost estimates.

## Annotation Model

Table: `construction_annotations`

Supported overlays:

- Point/pin.
- Line.
- Rectangle.
- Text label.
- Color/category.
- Linked `measurement_id`.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `project_id uuid not null references construction_projects(id) on delete cascade`
- `plan_file_id uuid not null references construction_plan_files(id) on delete cascade`
- `measurement_id uuid null references construction_measurements(id) on delete set null`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `annotation_type text not null`
- `x1 numeric not null`
- `y1 numeric not null`
- `x2 numeric`
- `y2 numeric`
- `label text`
- `color_key text not null default 'black'`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Coordinate rules:

- Store normalized coordinates from `0` to `1`, not fixed pixels.
- For PDFs, coordinates are page-relative and `metadata.page_number` is required.
- Preserve original uploaded file and render overlays separately.

Recommended rendering approach:

- Use SVG overlays on top of image/PDF preview for MVP.
- SVG is preferable for normalized line/rectangle/pin/text elements, hit testing, and PDF export.
- Current dependencies do not include a specialized annotation library; build lightweight React/SVG interactions first.
- Add pan/zoom with CSS transforms and controlled scale/offset state.
- Touch drag must support pointer events.
- Include delete and single-step undo for the current editing session.
- Canvas can be considered later for advanced performance, but SVG is simpler and more inspectable for MVP.

No AI or computer vision is required.

## Scope Notes and Crew Instructions

Table: `construction_scope_sections`

Fields:

- `id uuid primary key default gen_random_uuid()`
- `project_id uuid not null references construction_projects(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `section_key text not null`
- `title text not null`
- `content text`
- `sort_order integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Scope sections:

- Project summary.
- Included work.
- Exclusions.
- Assumptions.
- Material notes.
- Access/site notes.
- Customer notes.

Table: `construction_crew_instructions`

Fields:

- `id uuid primary key default gen_random_uuid()`
- `project_id uuid not null references construction_projects(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `checklist jsonb not null default '[]'::jsonb`
- `work_sequence text`
- `measurement_references jsonb not null default '[]'::jsonb`
- `material_summary_notes text`
- `plan_file_references jsonb not null default '[]'::jsonb`
- `user_safety_notes text`
- `assigned_crew_text text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Rules:

- Do not auto-generate legal or safety-compliance statements.
- Safety notes are user-entered notes, not OSHA/legal compliance advice.

## PDF Export

Table: `construction_export_records`

Fields:

- `id uuid primary key default gen_random_uuid()`
- `project_id uuid not null references construction_projects(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `storage_path text not null`
- `filename text not null`
- `export_type text not null default 'pdf'`
- `idempotency_key text`
- `status text not null default 'generated'`
- `created_at timestamptz not null default now()`

PDF contents:

- Company/project header.
- Customer/contact.
- Jobsite.
- Project description.
- Selected plan/photo previews.
- Annotation legend.
- Measurement summary.
- Materials summary.
- Waste assumptions.
- Scope.
- Crew instructions.
- Disclaimers.
- Created timestamp.

Requirements:

- Server-generated.
- Private owned project only.
- Safe filename.
- Download via signed URL.
- Email only if an existing verified email provider is connected and confirms delivery path.
- No permanent public link by default.

Recommended PDF approach:

- Use existing repository dependency `jspdf` for MVP server-side PDF generation if it works in the Next route runtime.
- Use `pdfjs-dist` only for preview/extracting PDF page thumbnails if feasible.
- If higher fidelity layout is required later, evaluate a headless-browser render path, but do not introduce it in MVP unless necessary.
- Store generated PDFs in the private construction storage bucket.

## Database Design

Proposed additive tables:

- `construction_projects`
- `construction_plan_files`
- `construction_measurements`
- `construction_material_templates`
- `construction_material_items`
- `construction_annotations`
- `construction_scope_sections`
- `construction_crew_instructions`
- `construction_export_records`

Shared requirements:

- Every user-data table has `user_id`.
- Child tables reference parent project.
- RLS enabled on every table.
- Policies restrict read/insert/update/delete to owner.
- Child records must validate parent ownership.
- Add `updated_at` triggers for mutable tables.
- Use `archived_at` for projects; child rows can cascade delete only when project is permanently deleted.
- Do not duplicate CRM, Documents, Tasks, Planner, or Invoicing tables.

Indexes and constraints:

- `construction_projects(user_id, status, updated_at desc)`
- `construction_projects(user_id, archived_at)`
- `construction_plan_files(project_id, created_at desc)`
- `construction_plan_files(user_id, project_id)`
- `construction_measurements(project_id, measurement_type)`
- `construction_measurements(user_id, project_id)`
- `construction_annotations(plan_file_id, created_at)`
- `construction_scope_sections(project_id, section_key)` unique.
- `construction_export_records(project_id, created_at desc)`
- `construction_export_records(user_id, project_id, idempotency_key)` unique where `idempotency_key is not null`.

Parent-chain ownership:

- Inserts into child tables must verify `construction_projects.user_id = auth.uid()`.
- Plan-file annotations must verify both project and plan file share the same owner and project.
- Measurement-linked annotations must verify the measurement belongs to the same project.
- CRM links must verify contact/company ownership.

Deletion behavior:

- Archive project for normal user delete.
- Permanent project delete can cascade child construction records.
- Storage files should be removed or orphan-cleaned after plan/export deletion.
- Export records are immutable except status updates.

## Storage Design

Bucket: `alma-construction`

Requirements:

- Private bucket.
- No public read.
- Path convention: `{user_id}/{project_id}/plans/{uuid}-{safe_filename}`.
- Export path: `{user_id}/{project_id}/exports/{uuid}-{safe_filename}`.
- Owner-scoped upload.
- Signed read/download URLs.
- Supported upload types:
  - `application/pdf`
  - `image/png`
  - `image/jpeg`
- Suggested size limits:
  - PDF: 25MB.
  - Image: 15MB.
  - Export PDF: 25MB.
- Deletion removes storage object after ownership verification.
- PDF preview: generated thumbnail or first-page rendering when feasible; fallback to file card.
- Image preview: signed preview URL.

## API Design

All routes require authentication and server-side ownership checks. Payloads must be allowlisted and return typed safe errors, never raw Supabase errors.

Project routes:

- `GET /api/construction/projects`
- `POST /api/construction/projects`
- `GET /api/construction/projects/[projectId]`
- `PATCH /api/construction/projects/[projectId]`
- `POST /api/construction/projects/[projectId]/archive`
- `DELETE /api/construction/projects/[projectId]`

Plan/photo routes:

- `POST /api/construction/projects/[projectId]/files/upload`
- `GET /api/construction/projects/[projectId]/files`
- `DELETE /api/construction/projects/[projectId]/files/[fileId]`
- `GET /api/construction/projects/[projectId]/files/[fileId]/signed-url`

Measurement routes:

- `POST /api/construction/projects/[projectId]/measurements`
- `PATCH /api/construction/projects/[projectId]/measurements/[measurementId]`
- `DELETE /api/construction/projects/[projectId]/measurements/[measurementId]`
- `GET /api/construction/projects/[projectId]/measurement-summary`

Material routes:

- `GET /api/construction/material-templates`
- `POST /api/construction/projects/[projectId]/materials`
- `PATCH /api/construction/projects/[projectId]/materials/[itemId]`
- `DELETE /api/construction/projects/[projectId]/materials/[itemId]`

Annotation routes:

- `GET /api/construction/projects/[projectId]/files/[fileId]/annotations`
- `POST /api/construction/projects/[projectId]/files/[fileId]/annotations`
- `PATCH /api/construction/projects/[projectId]/annotations/[annotationId]`
- `DELETE /api/construction/projects/[projectId]/annotations/[annotationId]`

Scope and crew routes:

- `GET /api/construction/projects/[projectId]/scope`
- `PUT /api/construction/projects/[projectId]/scope`
- `GET /api/construction/projects/[projectId]/crew-instructions`
- `PUT /api/construction/projects/[projectId]/crew-instructions`

Export routes:

- `POST /api/construction/projects/[projectId]/exports/pdf`
- `GET /api/construction/projects/[projectId]/exports`
- `GET /api/construction/projects/[projectId]/exports/[exportId]/download`

Relationship routes:

- `POST /api/construction/projects/[projectId]/tasks`
- `POST /api/construction/projects/[projectId]/planner-items`
- `POST /api/construction/projects/[projectId]/invoice-draft`

Relationship rules:

- Create canonical Tasks, Planner items, and Invoice drafts through their existing repositories.
- Store only references or source metadata where supported.
- Do not duplicate task/planner/invoice data inside construction tables.

Export idempotency:

- PDF export accepts `idempotencyKey`.
- If a matching export exists for `(user_id, project_id, idempotency_key)`, return the existing export record.
- Do not trust client-supplied ownership IDs.

## UX Design

ALMA-compatible workflow:

- Use `AlmaShell`.
- Projects screen starts with project cards and an `Add Project` action.
- New Project uses a stepper, not one giant form.
- Project detail uses step progress:
  1. Overview
  2. Files
  3. Measurements
  4. Materials
  5. Scope
  6. Crew
  7. Preview
  8. Export
- Mobile annotation opens full-screen.
- Measurement cards show live formula preview.
- Material summary cards show assumptions and editable factors.
- PDF preview shows the export sections before generation.
- Use Lucide icons.
- Support EN/ES.
- No page-level horizontal scrolling.

Desktop behavior:

- Left step rail.
- Center active tool.
- Right summary/action panel.
- Preview/export can use a two-column layout with PDF preview and export options.

## Required Disclaimers

Core copy:

- "Estimates only. Verify all field measurements before ordering materials or starting work."
- "This is not engineering, architectural, or building-code approval."
- "This is not an automated professional takeoff. Quantities depend on user-entered measurements and assumptions."
- "Material waste factors are assumptions and may vary by site conditions, product, crew, and installation method."
- "Uploaded files remain private and user-owned unless the user chooses to export or share them."

Spanish copy:

- "Solo estimaciones. Verifica todas las medidas en campo antes de ordenar materiales o iniciar el trabajo."
- "Esto no es asesoria de ingenieria, arquitectura ni aprobacion de codigo de construccion."
- "Esto no es un takeoff profesional automatizado. Las cantidades dependen de medidas y supuestos ingresados por el usuario."
- "Los factores de desperdicio son supuestos y pueden variar por condiciones del sitio, producto, equipo e instalacion."
- "Los archivos subidos permanecen privados y son propiedad del usuario salvo que el usuario decida exportarlos o compartirlos."

Placement:

- Project creation.
- Measurement summary.
- Materials summary.
- PDF preview.
- Export flow.
- PDF footer/disclaimer page.

## MVP Exclusions

Explicitly excluded:

- AI scale detection.
- Automatic measurement recognition.
- Automatic room detection.
- OCR.
- Structural engineering.
- Code validation.
- Supplier pricing.
- Payroll.
- Scheduling automation.
- Crew GPS.
- AR/holograms.
- Live collaboration.
- Offline sync.
- CAD editing.
- BIM.
- Automated proposal acceptance.
- Procore/Bluebeam replacement claims.

## Build Plan

### P6-A: Migration, Storage, Repositories, Owned APIs

- Files:
  - `supabase/migrations/*_construction_workspace.sql`
  - `lib/db/repositories/construction/*`
  - `app/api/construction/**`
- Dependencies:
  - Supabase RLS.
  - Existing auth helpers.
  - Existing CRM/Documents/Tasks/Planner/Invoicing repositories where linked.
- Risks:
  - Parent-chain RLS mistakes.
  - Storage ownership mismatch.
  - Payload shape drift.
- Acceptance tests:
  - Two-user RLS tests.
  - Owner-only CRUD.
  - Private upload/download signed URL tests.
  - No raw Supabase errors.
- Migration requirements:
  - Additive tables only.
  - Private storage bucket.
  - Updated-at triggers.
- Security checks:
  - Server-side ownership validation.
  - Storage path begins with authenticated user ID.
- Complexity: large.

### P6-B: Projects List/Create/Detail

- Files:
  - `app/construction/page.tsx`
  - `components/construction/*`
  - optional `lib/construction/types.ts`
- Dependencies:
  - P6-A project APIs.
  - AlmaShell.
- Risks:
  - Mobile wizard becoming too form-heavy.
  - CRM link UX confusion.
- Acceptance tests:
  - Create project.
  - Link existing contact/company.
  - Archive project.
  - Mobile 390px no horizontal scroll.
- Migration requirements: none beyond P6-A.
- Security checks:
  - Linked CRM ownership verification.
- Complexity: medium.

### P6-C: File Upload and Measurement Calculator

- Files:
  - `app/construction/page.tsx`
  - `components/construction/FileUpload.tsx`
  - `components/construction/MeasurementCalculator.tsx`
  - `lib/construction/calculations.ts`
- Dependencies:
  - P6-A file and measurement APIs.
- Risks:
  - Overstating precision.
  - Large file preview performance.
- Acceptance tests:
  - Upload PDF/image.
  - Invalid file rejected.
  - Create linear/area/volume/perimeter/count measurement.
  - Formula correctness tests.
- Migration requirements: none beyond P6-A.
- Security checks:
  - Signed preview only.
  - No public URL.
- Complexity: large.

### P6-D: Annotations

- Files:
  - `components/construction/AnnotationCanvas.tsx`
  - `components/construction/AnnotationToolbar.tsx`
  - annotation API integration.
- Dependencies:
  - P6-A annotations APIs.
  - File preview rendering.
- Risks:
  - Touch drag accuracy.
  - PDF page coordinate handling.
- Acceptance tests:
  - Add pin/line/rectangle/text.
  - Move/delete/undo.
  - Coordinates remain normalized after resize.
- Migration requirements: none beyond P6-A.
- Security checks:
  - Annotation plan/project ownership validation.
- Complexity: large.

### P6-E: Materials, Scope, Crew Instructions

- Files:
  - `components/construction/Materials.tsx`
  - `components/construction/ScopeNotes.tsx`
  - `components/construction/CrewInstructions.tsx`
- Dependencies:
  - Material templates.
  - Scope and crew APIs.
- Risks:
  - Default material factors perceived as certified.
  - Overly long mobile forms.
- Acceptance tests:
  - Select/edit template factors.
  - Save scope sections.
  - Save crew checklist/instructions.
- Migration requirements: none beyond P6-A.
- Security checks:
  - Owner-only scope/material/crew updates.
- Complexity: medium.

### P6-F: PDF Export

- Files:
  - `app/api/construction/projects/[projectId]/exports/pdf/route.ts`
  - `lib/construction/pdf.ts`
  - `components/construction/PdfPreview.tsx`
- Dependencies:
  - Existing `jspdf`.
  - Private storage bucket.
- Risks:
  - Server runtime compatibility.
  - Poor preview fidelity for large images/PDF pages.
- Acceptance tests:
  - Generate PDF.
  - Idempotency key returns existing export.
  - Download signed URL.
  - Verify disclaimers in PDF.
- Migration requirements: export records table from P6-A.
- Security checks:
  - Owned project only.
  - Private storage write/read.
- Complexity: medium.

### P6-G: AlmaShell, Marketplace Beta Entry, EN/ES, Final Audit

- Files:
  - `lib/platform/workspaceRoutes.ts`
  - `components/alma-shell/types.ts`
  - marketplace catalog files.
  - final construction UI copy.
- Dependencies:
  - P6-B through P6-F.
- Risks:
  - Claiming production readiness too early.
  - Shell route wiring regressions.
- Acceptance tests:
  - Navigation works.
  - Marketplace Beta state truthful.
  - EN/ES copy works.
  - Full mobile audit.
- Migration requirements: none beyond P6-A.
- Security checks:
  - Module gate if required.
- Complexity: medium.

## Release Criteria

### Beta

- Mobile flow works at 390px, 430px, 768px, and desktop.
- No page-level horizontal scroll.
- Project CRUD works.
- Upload/download stays private.
- Basic measurement formulas covered by tests.
- PDF export generates with disclaimers.
- RLS two-user tests pass.
- Marketplace entry labeled Beta.
- No unsupported takeoff/engineering/code claims.

### Production-Safe

- Storage cleanup verified.
- PDF output visually reviewed.
- Error states and retry paths complete.
- Accessibility pass for buttons, labels, dialogs, and keyboard focus.
- Export idempotency tested.
- Large file limits enforced.
- Spanish/English copy reviewed.
- No fake precision in UI or PDF.

### Later Advanced Takeoff Edition

- Separate approval required for any AI/OCR/scale-detection feature.
- Any automated measurement claim requires calibration workflow, test corpus, disclaimers, and accuracy reporting.
- Any supplier pricing requires provider contracts and clear freshness/region labels.
- Any code-compliance feature requires legal/product review.
