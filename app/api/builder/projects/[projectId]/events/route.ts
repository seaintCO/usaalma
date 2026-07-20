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
  const url = new URL(request.url);
  const afterSequence = Number(url.searchParams.get("after") ?? 0);

  try {
    const events = await BuilderService.listEvents({
      userId: auth.user.id,
      workspaceId: workspaceIdFromRequest(request),
      projectId,
      afterSequence: Number.isFinite(afterSequence) ? afterSequence : 0,
    });
    return NextResponse.json({ ok: true, events });
  } catch (error) {
    return builderErrorResponse(error);
  }
}
