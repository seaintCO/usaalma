export const officeEstimateStatuses = [
  "draft",
  "awaiting_review",
  "approved",
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
  "converted_to_invoice",
  "cancelled",
] as const;

export type OfficeEstimateStatus = (typeof officeEstimateStatuses)[number];

export type OfficeServiceInput = {
  name: string;
  descriptionEn?: string | null;
  descriptionEs?: string | null;
  unitType?: string | null;
  standardRate: number;
  minimumCharge?: number;
  taxable?: boolean;
  defaultDepositPercentage?: number;
  active?: boolean;
  internalNotes?: string | null;
};

export type OfficeEstimateLineInput = {
  serviceId?: string | null;
  description: string;
  quantity: number;
  unitType?: string | null;
  unitRate: number;
  discountAmount?: number;
  taxable?: boolean;
};

export type OfficeEstimateDraftInput = {
  contactId?: string | null;
  companyId?: string | null;
  projectId?: string | null;
  currency?: string;
  scope?: string | null;
  message?: string | null;
  taxRate?: number;
  depositPercentage?: number;
  lines: OfficeEstimateLineInput[];
  idempotencyKey?: string | null;
  sourceExecutionId?: string | null;
};
