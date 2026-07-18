import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { officeTool } from "@/lib/tools/office/officeTools";

export async function POST(
  request: Request,
  context: { params: Promise<{ estimateId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { estimateId } = await context.params;
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(
    await officeTool(user.id, "prepare_estimate_delivery", {
      ...body,
      estimateId,
    }),
  );
}
