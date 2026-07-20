import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { OfficeRepository } from "@/lib/office/repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ estimateId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { estimateId } = await context.params;
  const estimate = await OfficeRepository.getEstimate(user.id, estimateId);
  if (!estimate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, estimate });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ estimateId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { estimateId } = await context.params;
    const body = await request.json();
    return NextResponse.json({
      ok: true,
      estimate: await OfficeRepository.transitionEstimate(
        user.id,
        estimateId,
        body.status,
        body.note,
      ),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Estimate could not be updated." },
      { status: 400 },
    );
  }
}
