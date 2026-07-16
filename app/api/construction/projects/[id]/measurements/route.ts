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
  routeError,
} from "@/lib/construction/routes";
import { ConstructionRepository } from "@/lib/db/repositories/construction/construction.repository";
import type {
  ConstructionMeasurementType,
  ConstructionUnit,
} from "@/lib/construction/calculations";

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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  const { id } = await context.params;
  try {
    const measurements = await ConstructionRepository.listMeasurements(
      user.id,
      id,
    );
    return ok({ measurements });
  } catch (cause) {
    return routeError(cause, "Construction measurements could not be loaded.");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  const { id } = await context.params;
  const body = await readJson(request);
  const measurementType = body.measurementType ?? body.measurement_type;
  const unit = body.unit;
  const label = cleanString(body.label, 160);
  if (!measurementTypes.has(measurementType) || !units.has(unit) || !label) {
    return fail(
      400,
      "validation_error",
      "Measurement type, unit, and label are required.",
    );
  }
  try {
    const measurement = await ConstructionRepository.createMeasurement(
      user.id,
      id,
      {
        planFileId: optionalString(body.planFileId ?? body.plan_file_id, 80),
        measurementType: measurementType as ConstructionMeasurementType,
        label,
        length: numberOrNull(body.length),
        width: numberOrNull(body.width),
        heightOrDepth: numberOrNull(body.heightOrDepth ?? body.height_or_depth),
        quantity: numberOrDefault(body.quantity, 1),
        unit: unit as ConstructionUnit,
        wastePercentage: numberOrDefault(
          body.wastePercentage ?? body.waste_percentage,
          0,
        ),
        notes: optionalString(body.notes, 2000),
      },
    );
    return ok({ measurement }, { status: 201 });
  } catch (cause) {
    return routeError(cause, "Construction measurement could not be created.");
  }
}
