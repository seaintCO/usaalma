import { getCurrentUser } from "@/lib/auth/user";
import { ConnectorRepository } from "@/lib/connectors/repository";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  try {
    const id = await ConnectorRepository.disconnectProvider({
      userId: user.id,
      provider: "paypal_business",
    });
    return Response.json({ ok: true, disconnected: Boolean(id) });
  } catch {
    return Response.json(
      { ok: false, error: { code: "paypal_disconnect_failed" } },
      { status: 503 },
    );
  }
}
