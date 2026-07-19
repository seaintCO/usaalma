import { NextResponse } from "next/server";
import { BuilderService } from "@/lib/builder/service";
import {
  builderErrorResponse,
  requireBuilderUser,
  workspaceIdFromRequest,
} from "../_shared";

export async function GET(request: Request) {
  const auth = await requireBuilderUser();
  if ("response" in auth) return auth.response;

  try {
    const projects = await BuilderService.listProjects({
      userId: auth.user.id,
      workspaceId: workspaceIdFromRequest(request),
    });
    return NextResponse.json({ ok: true, projects });
  } catch (error) {
    return builderErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireBuilderUser();
  if ("response" in auth) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const project = await BuilderService.createDraft({
      userId: auth.user.id,
      workspaceId: workspaceIdFromRequest(request),
      draft: {
        title: typeof body.title === "string" ? body.title : "",
        originalPrompt:
          typeof body.originalPrompt === "string" ? body.originalPrompt : "",
        preferredLanguage: body.preferredLanguage === "es" ? "es" : "en",
        projectType:
          typeof body.projectType === "string"
            ? body.projectType
            : "custom_app",
        companyContext:
          typeof body.companyContext === "string" ? body.companyContext : "",
        idempotencyKey:
          typeof body.idempotencyKey === "string" ? body.idempotencyKey : null,
        starterKey:
          typeof body.starterKey === "string" ? body.starterKey : null,
      },
    });
    return NextResponse.json({ ok: true, project }, { status: 201 });
  } catch (error) {
    return builderErrorResponse(error);
  }
}
