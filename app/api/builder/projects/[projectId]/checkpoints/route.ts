import { NextResponse } from "next/server";
import { BuilderService } from "@/lib/builder/service";
import {
  builderErrorResponse,
  requireBuilderUser,
  workspaceIdFromRequest,
} from "../../../_shared";

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const auth = await requireBuilderUser();
  if ("response" in auth) return auth.response;
  const { projectId } = await context.params;

  try {
    const checkpoints = await BuilderService.listCheckpoints({
      userId: auth.user.id,
      workspaceId: workspaceIdFromRequest(request),
      projectId,
    });
    return NextResponse.json({ ok: true, checkpoints });
  } catch (error) {
    return builderErrorResponse(error);
  }
}
