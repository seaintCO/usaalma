import { ok } from "@/lib/construction/api";
import { requireConstructionUser, routeError } from "@/lib/construction/routes";
import { ConstructionRepository } from "@/lib/db/repositories/construction/construction.repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  const { id } = await context.params;
  try {
    const exports = await ConstructionRepository.listExports(user.id, id);
    return ok({ exports });
  } catch (cause) {
    return routeError(cause, "Construction exports could not be loaded.");
  }
}
