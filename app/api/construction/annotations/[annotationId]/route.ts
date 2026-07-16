import {
  cleanString,
  fail,
  numberOrNull,
  ok,
  optionalString,
} from "@/lib/construction/api";
import { normalizeAnnotationColor } from "@/lib/construction/annotations";
import {
  readJson,
  requireConstructionUser,
  requireDeleteConfirmation,
  routeError,
} from "@/lib/construction/routes";
import {
  constructionAnnotationTypes,
  isAllowed,
  type ConstructionAnnotationInput,
} from "@/lib/construction/types";
import { ConstructionRepository } from "@/lib/db/repositories/construction/construction.repository";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ annotationId: string }> },
) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  const { annotationId } = await context.params;
  const body = await readJson(request);
  const patch: Partial<ConstructionAnnotationInput> = {};
  if (body.planFileId !== undefined || body.plan_file_id !== undefined) {
    patch.planFileId = cleanString(body.planFileId ?? body.plan_file_id, 80);
  }
  if (body.measurementId !== undefined || body.measurement_id !== undefined) {
    patch.measurementId = optionalString(
      body.measurementId ?? body.measurement_id,
      80,
    );
  }
  if (body.annotationType !== undefined || body.annotation_type !== undefined) {
    const value = body.annotationType ?? body.annotation_type;
    if (!isAllowed(value, constructionAnnotationTypes)) {
      return fail(400, "validation_error", "Invalid annotation type.");
    }
    patch.annotationType = value;
  }
  if (body.x1 !== undefined) {
    const value = numberOrNull(body.x1);
    if (value === null) {
      return fail(400, "validation_error", "Invalid x1 coordinate.");
    }
    patch.x1 = value;
  }
  if (body.y1 !== undefined) {
    const value = numberOrNull(body.y1);
    if (value === null) {
      return fail(400, "validation_error", "Invalid y1 coordinate.");
    }
    patch.y1 = value;
  }
  if (body.x2 !== undefined) patch.x2 = numberOrNull(body.x2);
  if (body.y2 !== undefined) patch.y2 = numberOrNull(body.y2);
  if (body.label !== undefined) patch.label = optionalString(body.label, 500);
  if (body.colorKey !== undefined || body.color_key !== undefined) {
    patch.colorKey = normalizeAnnotationColor(body.colorKey ?? body.color_key);
  }
  if (body.metadata !== undefined) {
    patch.metadata =
      body.metadata && typeof body.metadata === "object" ? body.metadata : {};
  }
  try {
    const annotation = await ConstructionRepository.updateAnnotation(
      user.id,
      annotationId,
      patch,
    );
    return annotation
      ? ok({ annotation })
      : fail(404, "not_found", "Construction annotation was not found.");
  } catch (cause) {
    return routeError(cause, "Construction annotation could not be updated.");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ annotationId: string }> },
) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  if (!requireDeleteConfirmation(request)) {
    return fail(400, "validation_error", "Deletion requires confirmation.");
  }
  const { annotationId } = await context.params;
  try {
    const deleted = await ConstructionRepository.deleteAnnotation(
      user.id,
      annotationId,
    );
    return deleted
      ? ok({ deleted: true })
      : fail(404, "not_found", "Construction annotation was not found.");
  } catch (cause) {
    return routeError(cause, "Construction annotation could not be deleted.");
  }
}
