import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { listMemoryCandidates } from "@/lib/voice/repository";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  const candidates = await listMemoryCandidates(user.id);
  return NextResponse.json({ ok: true, candidates });
}
