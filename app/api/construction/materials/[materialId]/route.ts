import { cleanString, fail, ok, optionalString } from "@/lib/construction/api";
import {
  readJson,
  requireConstructionUser,
  requireDeleteConfirmation,
  routeError,
} from "@/lib/construction/routes";
import type { ConstructionMaterialInput } from "@/lib/construction/types";
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ materialId: string }> },
) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  const { materialId } = await context.params;
  const body = await readJson(request);
  const patch: Partial<ConstructionMaterialInput> = {};
  if (body.templateId !== undefined || body.template_id !== undefined) {
    patch.templateId = optionalString(body.templateId ?? body.template_id, 80);
  }
  if (body.measurementId !== undefined || body.measurement_id !== undefined) {
    patch.measurementId = optionalString(
      body.measurementId ?? body.measurement_id,
      80,
    );
  }
  if (body.materialName !== undefined || body.material_name !== undefined) {
    patch.materialName = cleanString(
      body.materialName ?? body.material_name,
      160,
    );
  }
  if (
    body.sourceMeasurementType !== undefined ||
    body.source_measurement_type !== undefined
  ) {
    patch.sourceMeasurementType = optionalString(
      body.sourceMeasurementType ?? body.source_measurement_type,
      80,
    );
  }
  if (
    body.conversionFactor !== undefined ||
    body.conversion_factor !== undefined
  ) {
    const parsed = numberOrValidationError(
      body.conversionFactor ?? body.conversion_factor,
      1,
    );
    if (!parsed.ok) {
      return fail(
        400,
        "validation_error",
        "Material numeric values are invalid.",
      );
    }
    patch.conversionFactor = parsed.value;
  }
  if (body.unit !== undefined) patch.unit = cleanString(body.unit, 80);
  if (
    body.calculatedQuantity !== undefined ||
    body.calculated_quantity !== undefined
  ) {
    const parsed = numberOrValidationError(
      body.calculatedQuantity ?? body.calculated_quantity,
      0,
    );
    if (!parsed.ok) {
      return fail(
        400,
        "validation_error",
        "Material numeric values are invalid.",
      );
    }
    patch.calculatedQuantity = parsed.value;
  }
  if (
    body.manualQuantityOverride !== undefined ||
    body.manual_quantity_override !== undefined
  ) {
    const parsed = nullableNumberOrValidationError(
      body.manualQuantityOverride ?? body.manual_quantity_override,
    );
    if (!parsed.ok) {
      return fail(
        400,
        "validation_error",
        "Material numeric values are invalid.",
      );
    }
    patch.manualQuantityOverride = parsed.value;
  }
  if (body.wasteFactor !== undefined || body.waste_factor !== undefined) {
    const parsed = numberOrValidationError(
      body.wasteFactor ?? body.waste_factor,
      0,
    );
    if (!parsed.ok) {
      return fail(
        400,
        "validation_error",
        "Material numeric values are invalid.",
      );
    }
    patch.wasteFactor = parsed.value;
  }
  if (body.notes !== undefined) patch.notes = optionalString(body.notes, 2000);
  if (body.sortOrder !== undefined || body.sort_order !== undefined) {
    const parsed = numberOrValidationError(
      body.sortOrder ?? body.sort_order,
      0,
    );
    if (!parsed.ok) {
      return fail(
        400,
        "validation_error",
        "Material numeric values are invalid.",
      );
    }
    patch.sortOrder = parsed.value;
  }
  try {
    const material = await ConstructionRepository.updateMaterial(
      user.id,
      materialId,
      patch,
    );
    return material
      ? ok({ material })
      : fail(404, "not_found", "Construction material was not found.");
  } catch (cause) {
    return routeError(cause, "Construction material could not be updated.");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ materialId: string }> },
) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  if (!requireDeleteConfirmation(request)) {
    return fail(400, "validation_error", "Deletion requires confirmation.");
  }
  const { materialId } = await context.params;
  try {
    const deleted = await ConstructionRepository.deleteMaterial(
      user.id,
      materialId,
    );
    return deleted
      ? ok({ deleted: true })
      : fail(404, "not_found", "Construction material was not found.");
  } catch (cause) {
    return routeError(cause, "Construction material could not be deleted.");
  }
}
