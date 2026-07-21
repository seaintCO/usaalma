import { normalizeBillingPlan } from "./plans";

export function checkoutContinuation(search: string) {
  const params = new URLSearchParams(search);
  const plan = normalizeBillingPlan(
    params.get("plan") || params.get("checkout"),
  );
  const requested = params.get("next");
  const next = requested === "/billing" ? requested : "/dashboard";
  return { plan, next };
}

export function loginContinuation(search: string) {
  const { plan, next } = checkoutContinuation(search);
  return plan ? `${next}?checkout=${encodeURIComponent(plan)}` : next;
}

export function continuationQuery(search: string) {
  const { plan, next } = checkoutContinuation(search);
  const params = new URLSearchParams();
  if (plan) params.set("plan", plan);
  if (next === "/billing") params.set("next", next);
  const value = params.toString();
  return value ? `?${value}` : "";
}
