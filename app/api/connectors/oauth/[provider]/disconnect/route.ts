import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { isEmailConnectorProvider } from "@/lib/connectors/config";
import { ConnectorRepository } from "@/lib/connectors/repository";

export async function POST(
  _request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  const { provider } = await context.params;
  if (!isEmailConnectorProvider(provider)) {
    return NextResponse.json(
      { ok: false, error: { code: "unsupported_provider" } },
      { status: 404 },
    );
  }
  try {
    const disconnectedId = await ConnectorRepository.disconnect({
      userId: user.id,
      provider,
    });
    return NextResponse.json({
      ok: true,
      disconnected: Boolean(disconnectedId),
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "disconnect_failed",
          message: "Connection could not be disconnected.",
        },
      },
      { status: 503 },
    );
  }
}
