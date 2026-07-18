import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ApprovalCenterService } from "@/lib/platform/approvals/approvalCenter.service";
import { resolveTenantWorkspace } from "@/lib/platform/workspace/tenantResolver";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 80);

  try {
    await resolveTenantWorkspace({ userId: user.id });
    const approvals = await ApprovalCenterService.listForUser(
      user.id,
      Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 80,
    );
    return NextResponse.json({ ok: true, approvals });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Approvals are temporarily unavailable. Confirm the platform foundation migration is applied.",
      },
      { status: 503 },
    );
  }
}

