import { cleanString, fail, ok, optionalString } from "@/lib/construction/api";
import {
  readJson,
  requireConstructionUser,
  routeError,
} from "@/lib/construction/routes";
import { ConstructionRepository } from "@/lib/db/repositories/construction/construction.repository";

function numberOrValidationError(value: unknown, fallback: number) {
  if (value === null || value === undefined || value === "") {
    return { ok: true as const, value: fallback };
  }
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? { ok: true as const, value: parsed }
    : { ok: false as const };
}

function nullableNumberOrValidationError(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return { ok: true as const, value: null };
  }
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? { ok: true as const, value: parsed }
    : { ok: false as const };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  const { id } = await context.params;
  try {
    const materials = await ConstructionRepository.listMaterials(user.id, id);
    return ok({ materials });
  } catch (cause) {
    return routeError(cause, "Construction materials could not be loaded.");
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
  const materialName = cleanString(
    body.materialName ?? body.material_name,
    160,
  );
  const unit = cleanString(body.unit, 80);
  if (!materialName || !unit) {
    return fail(
      400,
      "validation_error",
      "Material name and unit are required.",
    );
  }
  const conversionFactor = numberOrValidationError(
    body.conversionFactor ?? body.conversion_factor,
    1,
  );
  const calculatedQuantity = numberOrValidationError(
    body.calculatedQuantity ?? body.calculated_quantity,
    0,
  );
  const manualQuantityOverride = nullableNumberOrValidationError(
    body.manualQuantityOverride ?? body.manual_quantity_override,
  );
  const wasteFactor = numberOrValidationError(
    body.wasteFactor ?? body.waste_factor,
    0,
  );
  const sortOrder = numberOrValidationError(
    body.sortOrder ?? body.sort_order,
    0,
  );
  if (
    !conversionFactor.ok ||
    !calculatedQuantity.ok ||
    !manualQuantityOverride.ok ||
    !wasteFactor.ok ||
    !sortOrder.ok
  ) {
    return fail(
      400,
      "validation_error",
      "Material numeric values are invalid.",
    );
  }
  try {
    const material = await ConstructionRepository.createMaterial(user.id, id, {
      templateId: optionalString(body.templateId ?? body.template_id, 80),
      measurementId: optionalString(
        body.measurementId ?? body.measurement_id,
        80,
      ),
      materialName,
      sourceMeasurementType: optionalString(
        body.sourceMeasurementType ?? body.source_measurement_type,
        80,
      ),
      conversionFactor: conversionFactor.value,
      unit,
      calculatedQuantity: calculatedQuantity.value,
      manualQuantityOverride: manualQuantityOverride.value,
      wasteFactor: wasteFactor.value,
      notes: optionalString(body.notes, 2000),
      sortOrder: sortOrder.value,
    });
    return ok({ material }, { status: 201 });
  } catch (cause) {
    return routeError(cause, "Construction material could not be created.");
  }
}
