import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { BuilderServiceError } from "@/lib/builder/service";

export async function requireBuilderUser() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          error: {
            code: "unauthorized",
            message: "Authentication is required.",
          },
        },
        { status: 401 },
      ),
    };
  }
  return { user };
}

export function workspaceIdFromRequest(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("workspaceId") || null;
}

export function builderErrorResponse(error: unknown) {
  if (error instanceof BuilderServiceError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.httpStatus },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "builder_unavailable",
        message: "Builder is temporarily unavailable.",
      },
    },
    { status: 503 },
  );
}
