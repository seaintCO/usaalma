import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { OfficeRepository } from "@/lib/office/repository";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    estimates: await OfficeRepository.listEstimates(user.id),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    return NextResponse.json(
      {
        ok: true,
        estimate: await OfficeRepository.draftEstimate(user.id, body),
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Estimate could not be drafted." },
      { status: 400 },
    );
  }
}
