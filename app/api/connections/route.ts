import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { ConnectorRepository } from "@/lib/connectors/repository";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }

  try {
    const connections = await ConnectorRepository.listSummaries(user.id);
    return NextResponse.json({ ok: true, connections });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "connections_unavailable",
          message: "Connections are temporarily unavailable.",
        },
      },
      { status: 503 },
    );
  }
}
