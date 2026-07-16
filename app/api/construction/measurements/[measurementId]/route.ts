import {
  cleanString,
  fail,
  numberOrDefault,
  numberOrNull,
  ok,
  optionalString,
} from "@/lib/construction/api";
import {
  readJson,
  requireConstructionUser,
  requireDeleteConfirmation,
  routeError,
} from "@/lib/construction/routes";
import type {
  ConstructionMeasurementType,
  ConstructionUnit,
} from "@/lib/construction/calculations";
import type { ConstructionMeasurementInput } from "@/lib/construction/types";
import { ConstructionRepository } from "@/lib/db/repositories/construction/construction.repository";

const measurementTypes = new Set([
  "linear",
  "area",
  "volume",
  "perimeter",
  "count",
]);
const units = new Set([
  "feet",
  "inches",
  "square_feet",
  "cubic_feet",
  "yards",
  "square_yards",
  "cubic_yards",
  "each",
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ measurementId: string }> },
) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  const { measurementId } = await context.params;
  const body = await readJson(request);
  const patch: Partial<ConstructionMeasurementInput> = {};
  if (body.planFileId !== undefined || body.plan_file_id !== undefined) {
    patch.planFileId = optionalString(body.planFileId ?? body.plan_file_id, 80);
  }
  if (
    body.measurementType !== undefined ||
    body.measurement_type !== undefined
  ) {
    const value = body.measurementType ?? body.measurement_type;
    if (!measurementTypes.has(value)) {
      return fail(400, "validation_error", "Invalid measurement type.");
    }
    patch.measurementType = value as ConstructionMeasurementType;
  }
  if (body.label !== undefined) patch.label = cleanString(body.label, 160);
  if (body.length !== undefined) patch.length = numberOrNull(body.length);
  if (body.width !== undefined) patch.width = numberOrNull(body.width);
  if (body.heightOrDepth !== undefined || body.height_or_depth !== undefined) {
    patch.heightOrDepth = numberOrNull(
      body.heightOrDepth ?? body.height_or_depth,
    );
  }
  if (body.quantity !== undefined) {
    patch.quantity = numberOrDefault(body.quantity, 1);
  }
  if (body.unit !== undefined) {
    if (!units.has(body.unit))
      return fail(400, "validation_error", "Invalid unit.");
    patch.unit = body.unit as ConstructionUnit;
  }
  if (
    body.wastePercentage !== undefined ||
    body.waste_percentage !== undefined
  ) {
    patch.wastePercentage = numberOrDefault(
      body.wastePercentage ?? body.waste_percentage,
      0,
    );
  }
  if (body.notes !== undefined) patch.notes = optionalString(body.notes, 2000);
  try {
    const measurement = await ConstructionRepository.updateMeasurement(
      user.id,
      measurementId,
      patch,
    );
    return measurement
      ? ok({ measurement })
      : fail(404, "not_found", "Construction measurement was not found.");
  } catch (cause) {
    return routeError(cause, "Construction measurement could not be updated.");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ measurementId: string }> },
) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  if (!requireDeleteConfirmation(request)) {
    return fail(400, "validation_error", "Deletion requires confirmation.");
  }
  const { measurementId } = await context.params;
  try {
    const deleted = await ConstructionRepository.deleteMeasurement(
      user.id,
      measurementId,
    );
    return deleted
      ? ok({ deleted: true })
      : fail(404, "not_found", "Construction measurement was not found.");
  } catch (cause) {
    return routeError(cause, "Construction measurement could not be deleted.");
  }
}
