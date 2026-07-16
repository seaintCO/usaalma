import { fail, ok } from "@/lib/construction/api";
import {
  readJson,
  requireConstructionUser,
  routeError,
} from "@/lib/construction/routes";
import { ConstructionRepository } from "@/lib/db/repositories/construction/construction.repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  const { id } = await context.params;
  try {
    const scope = await ConstructionRepository.listScope(user.id, id);
    return ok({ scope });
  } catch (cause) {
    return routeError(cause, "Construction scope could not be loaded.");
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  const { id } = await context.params;
  const body = await readJson(request);
  const sections = Array.isArray(body.sections) ? body.sections : [];
  if (!sections.length) {
    return fail(
      400,
      "validation_error",
      "At least one scope section is required.",
    );
  }
  try {
    const scope = await ConstructionRepository.replaceScope(
      user.id,
      id,
      sections,
    );
    return ok({ scope });
  } catch (cause) {
    return routeError(cause, "Construction scope could not be saved.");
  }
}
