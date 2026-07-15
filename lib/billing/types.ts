export type BillingPlan = "starter" | "pro" | "business";

export type BillingSubscription = {
  plan: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  priceId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type BillingPriceOption = {
  plan: BillingPlan;
  amount: number | null;
  currency: string | null;
  interval: "day" | "week" | "month" | "year" | null;
};

export type BillingInvoice = {
  id: string;
  number: string | null;
  status: string | null;
  amountPaid: number;
  amountDue: number;
  currency: string;
  createdAt: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
};
