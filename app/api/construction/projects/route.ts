import { cleanString, fail, ok, optionalString } from "@/lib/construction/api";
import {
  readJson,
  requireConstructionUser,
  routeError,
} from "@/lib/construction/routes";
import { ConstructionRepository } from "@/lib/db/repositories/construction/construction.repository";
import {
  isAllowed,
  constructionProjectStatuses,
  constructionProjectTypes,
} from "@/lib/construction/types";

export async function GET(request: Request) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  const params = new URL(request.url).searchParams;
  try {
    const projects = await ConstructionRepository.listProjects(user.id, {
      query: params.get("q") ?? undefined,
      status: params.get("status") ?? undefined,
      projectType: params.get("projectType") ?? undefined,
    });
    return ok({ projects });
  } catch (cause) {
    return routeError(cause, "Construction projects could not be loaded.");
  }
}

export async function POST(request: Request) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  const body = await readJson(request);
  const projectName = cleanString(body.projectName ?? body.project_name, 160);
  if (!projectName) {
    return fail(400, "validation_error", "Project name is required.");
  }
  try {
    const project = await ConstructionRepository.createProject(user.id, {
      projectName,
      contactId: optionalString(body.contactId ?? body.contact_id, 80),
      companyId: optionalString(body.companyId ?? body.company_id, 80),
      jobsiteAddress: optionalString(
        body.jobsiteAddress ?? body.jobsite_address,
        500,
      ),
      projectType: isAllowed(
        body.projectType ?? body.project_type,
        constructionProjectTypes,
      )
        ? (body.projectType ?? body.project_type)
        : "custom",
      status: isAllowed(body.status, constructionProjectStatuses)
        ? body.status
        : "draft",
      description: optionalString(body.description, 5000),
    });
    return ok({ project }, { status: 201 });
  } catch (cause) {
    return routeError(cause, "Construction project could not be created.");
  }
}
