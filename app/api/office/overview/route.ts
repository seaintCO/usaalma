import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { OfficeRepository } from "@/lib/office/repository";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({
      ok: true,
      overview: await OfficeRepository.overview(user.id),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Office overview unavailable." },
      { status: 503 },
    );
  }
}
