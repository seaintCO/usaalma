import { NextResponse } from "next/server";
import { BuilderService } from "@/lib/builder/service";
import {
  builderErrorResponse,
  requireBuilderUser,
  workspaceIdFromRequest,
} from "../../_shared";

type BuilderProjectContext = {
  params: Promise<{ projectId: string }>;
};

export async function GET(request: Request, context: BuilderProjectContext) {
  const auth = await requireBuilderUser();
  if ("response" in auth) return auth.response;
  const { projectId } = await context.params;

  try {
    const project = await BuilderService.getProject({
      userId: auth.user.id,
      workspaceId: workspaceIdFromRequest(request),
      projectId,
    });
    return NextResponse.json({ ok: true, project });
  } catch (error) {
    return builderErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: BuilderProjectContext) {
  const auth = await requireBuilderUser();
  if ("response" in auth) return auth.response;
  const { projectId } = await context.params;

  try {
    const body = await request.json().catch(() => ({}));
    const project = await BuilderService.updateDraft({
      userId: auth.user.id,
      workspaceId: workspaceIdFromRequest(request),
      projectId,
      patch: {
        ...(typeof body.title === "string" ? { title: body.title } : {}),
        ...(typeof body.originalPrompt === "string"
          ? { originalPrompt: body.originalPrompt }
          : {}),
        ...(body.preferredLanguage === "en" || body.preferredLanguage === "es"
          ? { preferredLanguage: body.preferredLanguage }
          : {}),
        ...(typeof body.projectType === "string"
          ? { projectType: body.projectType }
          : {}),
        ...(typeof body.companyContext === "string"
          ? { companyContext: body.companyContext }
          : {}),
      },
    });
    return NextResponse.json({ ok: true, project });
  } catch (error) {
    return builderErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: BuilderProjectContext) {
  const auth = await requireBuilderUser();
  if ("response" in auth) return auth.response;
  const { projectId } = await context.params;

  try {
    const project = await BuilderService.archiveProject({
      userId: auth.user.id,
      workspaceId: workspaceIdFromRequest(request),
      projectId,
    });
    return NextResponse.json({ ok: true, project });
  } catch (error) {
    return builderErrorResponse(error);
  }
}
