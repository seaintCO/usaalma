import {
  cleanString,
  fail,
  numberOrNull,
  ok,
  optionalString,
} from "@/lib/construction/api";
import {
  readJson,
  requireConstructionUser,
  routeError,
} from "@/lib/construction/routes";
import {
  constructionAnnotationTypes,
  isAllowed,
} from "@/lib/construction/types";
import { ConstructionRepository } from "@/lib/db/repositories/construction/construction.repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  const { id } = await context.params;
  try {
    const annotations = await ConstructionRepository.listAnnotations(
      user.id,
      id,
    );
    return ok({ annotations });
  } catch (cause) {
    return routeError(cause, "Construction annotations could not be loaded.");
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
  const annotationType = body.annotationType ?? body.annotation_type;
  const planFileId = cleanString(body.planFileId ?? body.plan_file_id, 80);
  const x1 = numberOrNull(body.x1);
  const y1 = numberOrNull(body.y1);
  if (
    !planFileId ||
    !isAllowed(annotationType, constructionAnnotationTypes) ||
    x1 === null ||
    y1 === null
  ) {
    return fail(
      400,
      "validation_error",
      "Annotation type, plan file, and coordinates are required.",
    );
  }
  try {
    const annotation = await ConstructionRepository.createAnnotation(
      user.id,
      id,
      {
        planFileId,
        measurementId: optionalString(
          body.measurementId ?? body.measurement_id,
          80,
        ),
        annotationType,
        x1,
        y1,
        x2: numberOrNull(body.x2),
        y2: numberOrNull(body.y2),
        label: optionalString(body.label, 500),
        colorKey: optionalString(body.colorKey ?? body.color_key, 80),
        metadata:
          body.metadata && typeof body.metadata === "object"
            ? body.metadata
            : {},
      },
    );
    return ok({ annotation }, { status: 201 });
  } catch (cause) {
    return routeError(cause, "Construction annotation could not be created.");
  }
}
