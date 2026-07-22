import type { TokenUsage, UsageReservation, UsageUnits } from "./types";

export type UsageExecutionPort<TInput> = {
  reserve: (input: TInput) => Promise<UsageReservation>;
  settle: (
    reservation: UsageReservation,
    units: UsageUnits,
    tokens?: TokenUsage,
    providerReference?: string,
  ) => Promise<void>;
  release: (reservation: UsageReservation) => Promise<void>;
};

export async function executeUsageBoundary<TInput, TResult>(input: {
  port: UsageExecutionPort<TInput>;
  reservation: TInput;
  operation: () => Promise<TResult>;
  actualUnits: UsageUnits;
  usage?: (result: TResult) => TokenUsage;
  providerReference?: (result: TResult) => string | undefined;
}) {
  const reservation = await input.port.reserve(input.reservation);
  try {
    const result = await input.operation();
    await input.port.settle(
      reservation,
      input.actualUnits,
      input.usage?.(result),
      input.providerReference?.(result),
    );
    return result;
  } catch (error) {
    await input.port.release(reservation);
    throw error;
  }
}
