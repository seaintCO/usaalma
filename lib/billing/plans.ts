import type { BillingPlan } from "./types";

export const PUBLIC_PLAN_MAP = {
  office: "starter",
  ai: "business",
  essential: "starter",
  autonomous: "business",
  starter: "starter",
  personal: "starter",
  pro: "business",
  business: "business",
} as const;

export type PublicPlan = "office" | "ai";

export function normalizeBillingPlan(value: unknown): BillingPlan | null {
  const key = String(value ?? "").toLowerCase() as keyof typeof PUBLIC_PLAN_MAP;
  return PUBLIC_PLAN_MAP[key] ?? null;
}

export function publicPlanName(plan: string): PublicPlan | "free" {
  if (plan === "starter" || plan === "personal") return "office";
  if (plan === "business" || plan === "pro") return "ai";
  return "free";
}

export function billingPriceId(plan: BillingPlan) {
  if (plan === "starter") {
    return (
      process.env.STRIPE_PRICE_OFFICE_MONTHLY ||
      process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY ||
      process.env.STRIPE_PRICE_STARTER ||
      process.env.STRIPE_PRICE_PERSONAL
    );
  }
  return (
    process.env.STRIPE_PRICE_AI_MONTHLY ||
    process.env.STRIPE_PRICE_AUTONOMOUS_MONTHLY ||
    process.env.STRIPE_PRICE_BUSINESS ||
    process.env.STRIPE_PRICE_PRO
  );
}

export function planFromPriceId(
  priceId: string | null | undefined,
): BillingPlan | null {
  if (!priceId) return null;
  for (const plan of ["starter", "business"] as const) {
    if (billingPriceId(plan) === priceId) return plan;
  }
  return null;
}
