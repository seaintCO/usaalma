import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { WorkspaceInviteRepository } from "@/lib/db/repositories/workspaces/workspaceInvite.repository";
import { resolveTenantWorkspace } from "@/lib/platform/workspace/tenantResolver";

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (!body.workspaceId || !body.email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const tenant = await resolveTenantWorkspace({
    userId: user.id,
    workspaceId: String(body.workspaceId),
  });
  if (tenant.source !== "workspace_owner") {
    return NextResponse.json(
      { error: { code: "WORKSPACE_OWNER_REQUIRED" } },
      { status: 403 },
    );
  }

  const invite = await WorkspaceInviteRepository.invite(
    body.workspaceId,
    body.email,
    body.role ?? "member",
  );

  return NextResponse.json(invite);
}
