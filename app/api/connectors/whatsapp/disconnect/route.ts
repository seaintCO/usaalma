import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ConnectorRepository } from "@/lib/connectors/repository";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  await ConnectorRepository.disconnectProvider({
    userId: user.id,
    provider: "whatsapp_business",
  });
  return NextResponse.json({ ok: true });
}
