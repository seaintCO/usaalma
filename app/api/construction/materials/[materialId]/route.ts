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
import type { ConstructionMaterialInput } from "@/lib/construction/types";
import { ConstructionRepository } from "@/lib/db/repositories/construction/construction.repository";

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
    patch.conversionFactor = numberOrDefault(
      body.conversionFactor ?? body.conversion_factor,
      1,
    );
  }
  if (body.unit !== undefined) patch.unit = cleanString(body.unit, 80);
  if (
    body.calculatedQuantity !== undefined ||
    body.calculated_quantity !== undefined
  ) {
    patch.calculatedQuantity = numberOrDefault(
      body.calculatedQuantity ?? body.calculated_quantity,
      0,
    );
  }
  if (
    body.manualQuantityOverride !== undefined ||
    body.manual_quantity_override !== undefined
  ) {
    patch.manualQuantityOverride = numberOrNull(
      body.manualQuantityOverride ?? body.manual_quantity_override,
    );
  }
  if (body.wasteFactor !== undefined || body.waste_factor !== undefined) {
    patch.wasteFactor = numberOrDefault(
      body.wasteFactor ?? body.waste_factor,
      0,
    );
  }
  if (body.notes !== undefined) patch.notes = optionalString(body.notes, 2000);
  if (body.sortOrder !== undefined || body.sort_order !== undefined) {
    patch.sortOrder = numberOrDefault(body.sortOrder ?? body.sort_order, 0);
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
