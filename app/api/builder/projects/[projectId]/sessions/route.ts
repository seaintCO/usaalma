import { NextResponse } from "next/server";
import { BuilderService } from "@/lib/builder/service";
import {
  builderErrorResponse,
  requireBuilderUser,
  workspaceIdFromRequest,
} from "../../../_shared";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const auth = await requireBuilderUser();
  if ("response" in auth) return auth.response;
  const { projectId } = await context.params;

  try {
    const result = await BuilderService.startSession({
      userId: auth.user.id,
      workspaceId: workspaceIdFromRequest(request),
      projectId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return builderErrorResponse(error);
  }
}
