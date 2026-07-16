import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";

type Handler<TContext = unknown> = (
  userId: string,
  context: TContext,
) => Promise<Response> | Response;

export async function jsonBody(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function agentRoute<TContext>(
  context: TContext,
  handler: Handler<TContext>,
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "unauthorized", message: "Unauthorized." },
        },
        { status: 401 },
      );
    }
    return await handler(user.id, context);
  } catch (error) {
    console.error("[agent-builder]", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "server_error",
          message: "Agent Builder could not complete the request.",
        },
      },
      { status: 500 },
    );
  }
}

export async function paramsFrom<TParams>(context: {
  params: Promise<TParams>;
}) {
  return context.params;
}
