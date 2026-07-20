export type OfficeCalculationLine = {
  quantity: unknown;
  unitRate: unknown;
  discountAmount?: unknown;
  taxable?: boolean;
};

export type OfficeCalculationInput = {
  lines: OfficeCalculationLine[];
  taxRate?: unknown;
  depositPercentage?: unknown;
};

export function officeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateOfficeEstimate(input: OfficeCalculationInput) {
  const taxRate = Math.max(0, officeNumber(input.taxRate));
  const depositPercentage = Math.min(
    100,
    Math.max(0, officeNumber(input.depositPercentage)),
  );
  const lines = input.lines.map((line) => {
    const quantity = Math.max(0, officeNumber(line.quantity));
    const unitRate = Math.max(0, officeNumber(line.unitRate));
    const discountAmount = Math.max(0, officeNumber(line.discountAmount));
    const base = roundMoney(quantity * unitRate);
    const taxableBase = Math.max(0, base - discountAmount);
    const taxAmount =
      line.taxable === false ? 0 : roundMoney((taxableBase * taxRate) / 100);
    const lineTotal = roundMoney(taxableBase + taxAmount);
    return { base, taxAmount, lineTotal };
  });
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.base, 0));
  const discountAmount = roundMoney(
    input.lines.reduce(
      (sum, line) => sum + Math.max(0, officeNumber(line.discountAmount)),
      0,
    ),
  );
  const taxAmount = roundMoney(
    lines.reduce((sum, line) => sum + line.taxAmount, 0),
  );
  const total = roundMoney(Math.max(0, subtotal - discountAmount + taxAmount));
  const depositAmount = roundMoney((total * depositPercentage) / 100);
  return {
    subtotal,
    discountAmount,
    taxRate,
    taxAmount,
    total,
    depositPercentage,
    depositAmount,
    remainingBalance: roundMoney(Math.max(0, total - depositAmount)),
  };
}

export function createEstimateNumber() {
  return `EST-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}
