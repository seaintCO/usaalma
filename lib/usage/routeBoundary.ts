import "server-only";

import { UsageLimitError, usageErrorPayload } from "./service";

export function withUsageRoute<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response>,
) {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof UsageLimitError)
        return Response.json(usageErrorPayload(error), {
          status: error.status,
        });
      throw error;
    }
  };
}
