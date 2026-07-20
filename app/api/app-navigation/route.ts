import { getCurrentUser } from "@/lib/auth/user";
import {
  AppNavigationError,
  AppNavigationService,
} from "@/lib/platform/app-navigation/service";

function workspaceId(request: Request) {
  return new URL(request.url).searchParams.get("workspaceId");
}

function failure(error: unknown) {
  if (error instanceof AppNavigationError) {
    return Response.json(
      { ok: false, error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  console.error("APP_NAVIGATION_ERROR", {
    error: error instanceof Error ? error.name : "unknown",
  });
  return Response.json(
    {
      ok: false,
      error: {
        code: "app_navigation_unavailable",
        message: "App navigation is temporarily unavailable.",
      },
    },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return Response.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  try {
    return Response.json({
      ok: true,
      ...(await AppNavigationService.list({
        userId: user.id,
        workspaceId: workspaceId(request),
      })),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return Response.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.moduleId !== "string" || typeof body.pinned !== "boolean") {
      throw new AppNavigationError(
        "moduleId and pinned are required.",
        "invalid_request",
      );
    }
    const result = await AppNavigationService.setPinned({
      userId: user.id,
      workspaceId: workspaceId(request),
      moduleId: body.moduleId,
      pinned: body.pinned,
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return failure(error);
  }
}
