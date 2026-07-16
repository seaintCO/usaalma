import type { ConstructionMeasurementType } from "@/lib/construction/calculations";

export type ConstructionMaterialTemplate = {
  id: string;
  group: "masonry" | "chimney" | "floor" | "roof" | "wall";
  name: string;
  sourceMeasurementType: ConstructionMeasurementType | "manual";
  unit: string;
  conversionFactor: number;
  wasteFactor: number;
  notes: string;
};

export type MaterialCalculationInput = {
  measurementAdjustedTotal?: number | null;
  conversionFactor?: number | null;
  wasteFactor?: number | null;
  manualQuantityOverride?: number | null;
};

export const constructionMaterialTemplates: ConstructionMaterialTemplate[] = [
  {
    id: "masonry-brick-block",
    group: "masonry",
    name: "Brick/block per square foot",
    sourceMeasurementType: "area",
    unit: "units",
    conversionFactor: 1,
    wasteFactor: 5,
    notes: "Editable estimate based on field-verified area.",
  },
  {
    id: "masonry-mortar",
    group: "masonry",
    name: "Mortar bags",
    sourceMeasurementType: "area",
    unit: "bags",
    conversionFactor: 0.12,
    wasteFactor: 5,
    notes: "Editable mortar factor.",
  },
  {
    id: "masonry-sand",
    group: "masonry",
    name: "Sand",
    sourceMeasurementType: "volume",
    unit: "cubic yards",
    conversionFactor: 1,
    wasteFactor: 5,
    notes: "Manual site factor.",
  },
  {
    id: "masonry-concrete",
    group: "masonry",
    name: "Concrete volume",
    sourceMeasurementType: "volume",
    unit: "cubic yards",
    conversionFactor: 1,
    wasteFactor: 5,
    notes: "Estimate from user-entered volume.",
  },
  {
    id: "chimney-face-area",
    group: "chimney",
    name: "Face area",
    sourceMeasurementType: "area",
    unit: "sq ft",
    conversionFactor: 1,
    wasteFactor: 0,
    notes: "Field-verified face area.",
  },
  {
    id: "chimney-brick-block",
    group: "chimney",
    name: "Brick/block quantity",
    sourceMeasurementType: "area",
    unit: "units",
    conversionFactor: 1,
    wasteFactor: 7,
    notes: "Editable estimate for chimney face work.",
  },
  {
    id: "chimney-flue-components",
    group: "chimney",
    name: "Flue components",
    sourceMeasurementType: "count",
    unit: "each",
    conversionFactor: 1,
    wasteFactor: 0,
    notes: "Manual component count.",
  },
  {
    id: "chimney-cap",
    group: "chimney",
    name: "Cap area/volume",
    sourceMeasurementType: "area",
    unit: "sq ft",
    conversionFactor: 1,
    wasteFactor: 5,
    notes: "Editable cap estimate.",
  },
  {
    id: "floor-square-footage",
    group: "floor",
    name: "Square footage",
    sourceMeasurementType: "area",
    unit: "sq ft",
    conversionFactor: 1,
    wasteFactor: 10,
    notes: "Flooring estimate from measured area.",
  },
  {
    id: "floor-boxes-units",
    group: "floor",
    name: "Boxes/units",
    sourceMeasurementType: "area",
    unit: "boxes",
    conversionFactor: 0.05,
    wasteFactor: 10,
    notes: "Adjust factor to match product coverage.",
  },
  {
    id: "roof-area",
    group: "roof",
    name: "Roof area",
    sourceMeasurementType: "area",
    unit: "sq ft",
    conversionFactor: 1,
    wasteFactor: 10,
    notes: "Measured roof area estimate.",
  },
  {
    id: "roof-squares",
    group: "roof",
    name: "Roofing squares",
    sourceMeasurementType: "area",
    unit: "squares",
    conversionFactor: 0.01,
    wasteFactor: 10,
    notes: "One square is commonly 100 sq ft; verify product assumptions.",
  },
  {
    id: "roof-bundles",
    group: "roof",
    name: "Bundles",
    sourceMeasurementType: "area",
    unit: "bundles",
    conversionFactor: 0.03,
    wasteFactor: 10,
    notes: "Editable bundle factor.",
  },
  {
    id: "roof-underlayment",
    group: "roof",
    name: "Underlayment",
    sourceMeasurementType: "area",
    unit: "rolls",
    conversionFactor: 0.003,
    wasteFactor: 10,
    notes: "Adjust for actual roll coverage.",
  },
  {
    id: "wall-area",
    group: "wall",
    name: "Wall area",
    sourceMeasurementType: "area",
    unit: "sq ft",
    conversionFactor: 1,
    wasteFactor: 5,
    notes: "Measured wall area.",
  },
  {
    id: "wall-drywall-sheets",
    group: "wall",
    name: "Drywall sheets",
    sourceMeasurementType: "area",
    unit: "sheets",
    conversionFactor: 0.03125,
    wasteFactor: 10,
    notes: "Default assumes 32 sq ft sheets; edit factor as needed.",
  },
  {
    id: "wall-studs",
    group: "wall",
    name: "Studs",
    sourceMeasurementType: "linear",
    unit: "studs",
    conversionFactor: 0.75,
    wasteFactor: 5,
    notes: "Editable framing estimate.",
  },
  {
    id: "wall-paint-coverage",
    group: "wall",
    name: "Paint coverage",
    sourceMeasurementType: "area",
    unit: "gallons",
    conversionFactor: 0.003,
    wasteFactor: 5,
    notes: "Adjust for actual coverage and coats.",
  },
];

export function calculateMaterialQuantity(input: MaterialCalculationInput) {
  const base = input.measurementAdjustedTotal ?? 0;
  const factor = input.conversionFactor ?? 1;
  const waste = input.wasteFactor ?? 0;
  assertFiniteNonNegative(base, "measurementAdjustedTotal");
  assertFiniteNonNegative(factor, "conversionFactor");
  assertFiniteNonNegative(waste, "wasteFactor");
  if (waste > 100) throw new Error("wasteFactor must be 100 or less");
  const calculatedQuantity = roundMaterial(base * factor * (1 + waste / 100));
  const manual =
    input.manualQuantityOverride === null ||
    input.manualQuantityOverride === undefined
      ? null
      : input.manualQuantityOverride;
  if (manual !== null)
    assertFiniteNonNegative(manual, "manualQuantityOverride");
  return {
    calculatedQuantity,
    finalQuantity: manual ?? calculatedQuantity,
    overridden: manual !== null,
  };
}

export function isCompatibleMaterialSource(
  measurementType: string | null | undefined,
  sourceMeasurementType: string | null | undefined,
) {
  if (!sourceMeasurementType || sourceMeasurementType === "manual") return true;
  return measurementType === sourceMeasurementType;
}

export function displayMaterialQuantity(
  value: number | string | null | undefined,
) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return "-";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(number);
}

function assertFiniteNonNegative(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be zero or greater`);
  }
}

function roundMaterial(value: number) {
  return Math.round(value * 10000) / 10000;
}
