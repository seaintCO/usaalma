export function isUsageSubscriptionActive(status: string | null | undefined) {
  return status === "active" || status === "trialing";
}

export function resolveUsagePeriod(input: {
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  now?: Date;
}) {
  if (input.currentPeriodStart && input.currentPeriodEnd) {
    return { start: input.currentPeriodStart, end: input.currentPeriodEnd };
  }
  const now = input.now ?? new Date();
  return {
    start: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ).toISOString(),
    end: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    ).toISOString(),
  };
}
