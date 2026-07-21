import { getCurrentUser } from "@/lib/auth/user";
import {
  getUsageSummary,
  UsageLimitError,
  usageErrorPayload,
} from "@/lib/usage/service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    return Response.json(
      { ok: true, usage: await getUsageSummary(user.id) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const usageError =
      error instanceof UsageLimitError
        ? error
        : new UsageLimitError("usage_unavailable", 503);
    return Response.json(usageErrorPayload(usageError), {
      status: usageError.status,
    });
  }
}
