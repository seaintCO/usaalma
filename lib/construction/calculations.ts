export type ConstructionMeasurementType =
  "linear" | "area" | "volume" | "perimeter" | "count";

export type ConstructionUnit =
  | "feet"
  | "inches"
  | "square_feet"
  | "cubic_feet"
  | "yards"
  | "square_yards"
  | "cubic_yards"
  | "each";

export type MeasurementCalculationInput = {
  measurementType: ConstructionMeasurementType;
  length?: number | null;
  width?: number | null;
  heightOrDepth?: number | null;
  quantity?: number | null;
  unit: ConstructionUnit;
  wastePercentage?: number | null;
};

export type MeasurementCalculationResult = {
  baseTotal: number;
  adjustedTotal: number;
  unit: ConstructionUnit;
};

export type MeasurementValidationResult =
  | { ok: true; result: MeasurementCalculationResult }
  | { ok: false; message: string };

const unitKind: Record<
  ConstructionUnit,
  "linear" | "area" | "volume" | "count"
> = {
  feet: "linear",
  inches: "linear",
  yards: "linear",
  square_feet: "area",
  square_yards: "area",
  cubic_feet: "volume",
  cubic_yards: "volume",
  each: "count",
};

const requiredKind: Record<
  ConstructionMeasurementType,
  "linear" | "area" | "volume" | "count"
> = {
  linear: "linear",
  perimeter: "linear",
  area: "area",
  volume: "volume",
  count: "count",
};

function assertNonNegative(value: number | null | undefined, field: string) {
  if (value === null || value === undefined) return;
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be zero or greater`);
  }
}

function requiredPositive(value: number | null | undefined, field: string) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new Error(`${field} must be greater than zero`);
  }
  return value;
}

function roundStored(value: number) {
  return Math.round(value * 10000) / 10000;
}

export function displayMeasurementTotal(value: number) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}

export function unitKindFor(unit: ConstructionUnit) {
  return unitKind[unit];
}

export function assertCompatibleUnit(
  measurementType: ConstructionMeasurementType,
  unit: ConstructionUnit,
) {
  if (unitKind[unit] !== requiredKind[measurementType]) {
    throw new Error(`Unit ${unit} is not compatible with ${measurementType}`);
  }
}

export function convertUnit(
  value: number,
  from: ConstructionUnit,
  to: ConstructionUnit,
) {
  assertNonNegative(value, "value");
  if (from === to) return value;
  if (unitKind[from] !== unitKind[to]) {
    throw new Error(`Cannot convert ${from} to ${to}`);
  }

  const toBase: Record<ConstructionUnit, number> = {
    inches: 1 / 12,
    feet: 1,
    yards: 3,
    square_feet: 1,
    square_yards: 9,
    cubic_feet: 1,
    cubic_yards: 27,
    each: 1,
  };

  return (value * toBase[from]) / toBase[to];
}

export function calculateMeasurement(
  input: MeasurementCalculationInput,
): MeasurementCalculationResult {
  assertCompatibleUnit(input.measurementType, input.unit);

  const quantity = requiredPositive(input.quantity ?? 1, "quantity");
  const waste = input.wastePercentage ?? 0;
  assertNonNegative(waste, "wastePercentage");
  if (waste > 100) throw new Error("wastePercentage must be 100 or less");

  let baseTotal = 0;
  if (input.measurementType === "linear") {
    baseTotal = requiredPositive(input.length, "length") * quantity;
  } else if (input.measurementType === "area") {
    baseTotal =
      requiredPositive(input.length, "length") *
      requiredPositive(input.width, "width") *
      quantity;
  } else if (input.measurementType === "volume") {
    baseTotal =
      requiredPositive(input.length, "length") *
      requiredPositive(input.width, "width") *
      requiredPositive(input.heightOrDepth, "heightOrDepth") *
      quantity;
  } else if (input.measurementType === "perimeter") {
    baseTotal =
      2 *
      (requiredPositive(input.length, "length") +
        requiredPositive(input.width, "width")) *
      quantity;
  } else {
    baseTotal = quantity;
  }

  const adjustedTotal = baseTotal * (1 + waste / 100);
  if (!Number.isFinite(baseTotal) || !Number.isFinite(adjustedTotal)) {
    throw new Error("Measurement total is invalid");
  }
  return {
    baseTotal: roundStored(baseTotal),
    adjustedTotal: roundStored(adjustedTotal),
    unit: input.unit,
  };
}

export function tryCalculateMeasurement(
  input: MeasurementCalculationInput,
): MeasurementValidationResult {
  try {
    return { ok: true, result: calculateMeasurement(input) };
  } catch (cause) {
    return {
      ok: false,
      message:
        cause instanceof Error ? cause.message : "Measurement is invalid",
    };
  }
}
