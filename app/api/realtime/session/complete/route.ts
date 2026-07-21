import { getCurrentUser } from "@/lib/auth/user";
import { completeVoiceSessionRecord } from "@/lib/voice/repository";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return Response.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  const body = await request.json().catch(() => ({}));
  if (typeof body.localSessionId !== "string")
    return Response.json(
      { ok: false, error: { code: "session_required" } },
      { status: 400 },
    );
  const result = await completeVoiceSessionRecord({
    userId: user.id,
    sessionId: body.localSessionId,
  });
  if (!result)
    return Response.json(
      { ok: false, error: { code: "session_not_found" } },
      { status: 404 },
    );
  return Response.json({
    ok: true,
    seconds: result.seconds,
    duplicate: result.duplicate,
  });
}
