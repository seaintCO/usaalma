import { cleanString, fail, ok, optionalString } from "@/lib/construction/api";
import {
  readJson,
  requireConstructionUser,
  requireDeleteConfirmation,
  routeError,
} from "@/lib/construction/routes";
import {
  constructionProjectStatuses,
  constructionProjectTypes,
  isAllowed,
} from "@/lib/construction/types";
import { ConstructionRepository } from "@/lib/db/repositories/construction/construction.repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  const { id } = await context.params;
  try {
    const project = await ConstructionRepository.getProject(user.id, id);
    return project
      ? ok({ project })
      : fail(404, "not_found", "Construction project was not found.");
  } catch (cause) {
    return routeError(cause, "Construction project could not be loaded.");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  const { id } = await context.params;
  const body = await readJson(request);
  try {
    const project = await ConstructionRepository.updateProject(user.id, id, {
      projectName:
        body.projectName !== undefined || body.project_name !== undefined
          ? cleanString(body.projectName ?? body.project_name, 160)
          : undefined,
      contactId:
        body.contactId !== undefined || body.contact_id !== undefined
          ? optionalString(body.contactId ?? body.contact_id, 80)
          : undefined,
      companyId:
        body.companyId !== undefined || body.company_id !== undefined
          ? optionalString(body.companyId ?? body.company_id, 80)
          : undefined,
      jobsiteAddress:
        body.jobsiteAddress !== undefined || body.jobsite_address !== undefined
          ? optionalString(body.jobsiteAddress ?? body.jobsite_address, 500)
          : undefined,
      projectType: isAllowed(
        body.projectType ?? body.project_type,
        constructionProjectTypes,
      )
        ? (body.projectType ?? body.project_type)
        : undefined,
      status: isAllowed(body.status, constructionProjectStatuses)
        ? body.status
        : undefined,
      description:
        body.description !== undefined
          ? optionalString(body.description, 5000)
          : undefined,
    });
    return project
      ? ok({ project })
      : fail(404, "not_found", "Construction project was not found.");
  } catch (cause) {
    return routeError(cause, "Construction project could not be updated.");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  if (!requireDeleteConfirmation(request)) {
    return fail(400, "validation_error", "Deletion requires confirmation.");
  }
  const { id } = await context.params;
  try {
    const deleted = await ConstructionRepository.deleteProject(user.id, id);
    return deleted
      ? ok({ deleted: true })
      : fail(404, "not_found", "Construction project was not found.");
  } catch (cause) {
    return routeError(cause, "Construction project could not be deleted.");
  }
}
