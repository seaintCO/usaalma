import { fail, ok } from "@/lib/construction/api";
import { requireConstructionUser, routeError } from "@/lib/construction/routes";
import { ConstructionRepository } from "@/lib/db/repositories/construction/construction.repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; exportId: string }> },
) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  const { exportId } = await context.params;
  try {
    const signed = await ConstructionRepository.createExportSignedUrl(
      user.id,
      exportId,
    );
    return signed
      ? ok(signed)
      : fail(404, "not_found", "Construction export was not found.");
  } catch (cause) {
    return routeError(cause, "Construction export download is unavailable.");
  }
}
