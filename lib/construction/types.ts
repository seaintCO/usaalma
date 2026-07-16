import type {
  ConstructionMeasurementType,
  ConstructionUnit,
} from "@/lib/construction/calculations";

export const constructionProjectTypes = [
  "masonry",
  "chimney",
  "wall",
  "floor",
  "roof",
  "deck",
  "fence",
  "remodel",
  "custom",
] as const;

export const constructionProjectStatuses = [
  "draft",
  "active",
  "completed",
  "archived",
] as const;

export const constructionMimeTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
] as const;

export const constructionFileLimits = {
  "application/pdf": 25 * 1024 * 1024,
  "image/png": 15 * 1024 * 1024,
  "image/jpeg": 15 * 1024 * 1024,
} as const;

export const constructionFileAccept = "application/pdf,image/png,image/jpeg";

export const constructionAnnotationTypes = [
  "point",
  "line",
  "rectangle",
  "text",
] as const;

export const constructionScopeKeys = [
  "project_summary",
  "included_work",
  "exclusions",
  "assumptions",
  "material_notes",
  "access_site_notes",
  "customer_notes",
] as const;

export type ConstructionProjectType = (typeof constructionProjectTypes)[number];
export type ConstructionProjectStatus =
  (typeof constructionProjectStatuses)[number];
export type ConstructionMimeType = (typeof constructionMimeTypes)[number];
export type ConstructionAnnotationType =
  (typeof constructionAnnotationTypes)[number];
export type ConstructionScopeKey = (typeof constructionScopeKeys)[number];

export type ConstructionProjectInput = {
  projectName: string;
  contactId?: string | null;
  companyId?: string | null;
  jobsiteAddress?: string | null;
  projectType?: ConstructionProjectType;
  status?: ConstructionProjectStatus;
  description?: string | null;
};

export type ConstructionMeasurementInput = {
  planFileId?: string | null;
  measurementType: ConstructionMeasurementType;
  label: string;
  length?: number | null;
  width?: number | null;
  heightOrDepth?: number | null;
  quantity?: number | null;
  unit: ConstructionUnit;
  wastePercentage?: number | null;
  notes?: string | null;
};

export type ConstructionMaterialInput = {
  templateId?: string | null;
  measurementId?: string | null;
  materialName: string;
  sourceMeasurementType?: string | null;
  conversionFactor?: number | null;
  unit: string;
  calculatedQuantity?: number | null;
  manualQuantityOverride?: number | null;
  wasteFactor?: number | null;
  notes?: string | null;
  sortOrder?: number | null;
};

export type ConstructionAnnotationInput = {
  planFileId: string;
  measurementId?: string | null;
  annotationType: ConstructionAnnotationType;
  x1: number;
  y1: number;
  x2?: number | null;
  y2?: number | null;
  label?: string | null;
  colorKey?: string | null;
  metadata?: Record<string, unknown>;
};

export function isAllowed<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return typeof value === "string" && allowed.includes(value);
}
