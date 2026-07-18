import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { listCommunicationThreads } from "@/lib/communications/inboxRepository";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  const threads = await listCommunicationThreads(user.id);
  return NextResponse.json({ ok: true, threads });
}
