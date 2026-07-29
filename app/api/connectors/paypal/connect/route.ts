import { createHash } from "node:crypto";
import { getCurrentUser } from "@/lib/auth/user";
import { ConnectorRepository } from "@/lib/connectors/repository";
import { getPayPalAccessToken } from "@/lib/payments/paypal";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  const body = (await request.json().catch(() => ({}))) as {
    clientId?: string;
    clientSecret?: string;
    environment?: string;
  };
  const clientId = body.clientId?.trim() ?? "";
  const clientSecret = body.clientSecret?.trim() ?? "";
  const environment = body.environment === "live" ? "live" : "sandbox";
  if (clientId.length < 20 || clientSecret.length < 20) {
    return Response.json(
      { ok: false, error: { code: "paypal_credentials_required" } },
      { status: 400 },
    );
  }
  try {
    await getPayPalAccessToken({ clientId, clientSecret, environment });
    const workspaceId = await ConnectorRepository.resolveDefaultWorkspaceId(
      user.id,
    );
    if (!workspaceId) {
      return Response.json(
        { ok: false, error: { code: "workspace_required" } },
        { status: 409 },
      );
    }
    await ConnectorRepository.saveMerchantCredentialConnection({
      userId: user.id,
      workspaceId,
      provider: "paypal_business",
      clientId,
      clientSecret,
      providerAccountId: createHash("sha256")
        .update(clientId)
        .digest("hex")
        .slice(0, 24),
      environment,
    });
    return Response.json({ ok: true, connected: true, environment });
  } catch (error) {
    const code =
      error instanceof Error && error.message === "paypal_credentials_invalid"
        ? "paypal_credentials_invalid"
        : "paypal_connection_failed";
    return Response.json({ ok: false, error: { code } }, { status: 400 });
  }
}
