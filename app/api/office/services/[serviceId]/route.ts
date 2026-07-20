import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { OfficeRepository } from "@/lib/office/repository";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ serviceId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { serviceId } = await context.params;
    const body = await request.json();
    return NextResponse.json({
      ok: true,
      service: await OfficeRepository.updateService(user.id, serviceId, body),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Service could not be updated." },
      { status: 400 },
    );
  }
}
