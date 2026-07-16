import { fail, ok } from "@/lib/construction/api";
import {
  requireConstructionUser,
  requireDeleteConfirmation,
  routeError,
} from "@/lib/construction/routes";
import { ConstructionRepository } from "@/lib/db/repositories/construction/construction.repository";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ fileId: string }> },
) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  if (!requireDeleteConfirmation(request)) {
    return fail(400, "validation_error", "Deletion requires confirmation.");
  }
  const { fileId } = await context.params;
  try {
    const deleted = await ConstructionRepository.deleteFile(user.id, fileId);
    return deleted
      ? ok({ deleted: true })
      : fail(404, "not_found", "Construction file was not found.");
  } catch (cause) {
    return routeError(cause, "Construction file could not be deleted.");
  }
}
