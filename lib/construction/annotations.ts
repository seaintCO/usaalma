import {
  constructionAnnotationColorKeys,
  type ConstructionAnnotationColorKey,
  type ConstructionAnnotationType,
} from "@/lib/construction/types";

export type NormalizedPoint = {
  x: number;
  y: number;
};

export type AnnotationGeometry = {
  x1: number;
  y1: number;
  x2?: number | null;
  y2?: number | null;
};

export function normalizeAnnotationColor(
  value: unknown,
): ConstructionAnnotationColorKey {
  return typeof value === "string" &&
    constructionAnnotationColorKeys.includes(
      value as ConstructionAnnotationColorKey,
    )
    ? (value as ConstructionAnnotationColorKey)
    : "neutral";
}

export function isNormalizedCoordinate(value: unknown) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

export function pointFromViewport(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
): NormalizedPoint {
  return {
    x: clamp01((clientX - rect.left) / rect.width),
    y: clamp01((clientY - rect.top) / rect.height),
  };
}

export function pointToViewport(
  point: NormalizedPoint,
  width: number,
  height: number,
) {
  return {
    x: point.x * width,
    y: point.y * height,
  };
}

export function validateAnnotationGeometry(
  type: ConstructionAnnotationType,
  geometry: AnnotationGeometry,
) {
  if (
    !isNormalizedCoordinate(geometry.x1) ||
    !isNormalizedCoordinate(geometry.y1)
  ) {
    return false;
  }
  if (type === "line" || type === "rectangle") {
    return (
      isNormalizedCoordinate(geometry.x2) &&
      isNormalizedCoordinate(geometry.y2) &&
      (geometry.x1 !== geometry.x2 || geometry.y1 !== geometry.y2)
    );
  }
  return true;
}

export function normalizedBox(geometry: AnnotationGeometry) {
  const x2 = geometry.x2 ?? geometry.x1;
  const y2 = geometry.y2 ?? geometry.y1;
  return {
    x: Math.min(geometry.x1, x2),
    y: Math.min(geometry.y1, y2),
    width: Math.abs(x2 - geometry.x1),
    height: Math.abs(y2 - geometry.y1),
  };
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
