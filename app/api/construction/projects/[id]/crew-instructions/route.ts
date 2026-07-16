import { ok } from "@/lib/construction/api";
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
    const crewInstructions = await ConstructionRepository.getCrewInstructions(
      user.id,
      id,
    );
    return ok({ crewInstructions });
  } catch (cause) {
    return routeError(
      cause,
      "Construction crew instructions could not be loaded.",
    );
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
  try {
    const crewInstructions = await ConstructionRepository.saveCrewInstructions(
      user.id,
      id,
      body,
    );
    return ok({ crewInstructions });
  } catch (cause) {
    return routeError(
      cause,
      "Construction crew instructions could not be saved.",
    );
  }
}
