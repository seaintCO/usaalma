import { ConnectorRepository } from "./repository";
import type {
  EmailConnectorProvider,
  EmailDeliveryInput,
  EmailDeliveryResult,
} from "./types";
import { refreshGoogleAccessToken, sendGmailMessage } from "./providers/google";
import {
  refreshMicrosoftAccessToken,
  sendOutlookMessage,
} from "./providers/microsoft";

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() < Date.now() + 60_000;
}

async function getFreshToken(input: {
  connectionId: string;
  provider: EmailConnectorProvider;
}) {
  const token = await ConnectorRepository.readAccessToken(input.connectionId);
  if (!token.accessToken) throw new Error("connection_token_missing");
  if (!isExpired(token.expiresAt)) return token.accessToken;
  if (!token.refreshToken) throw new Error("refresh_token_missing");
  if (input.provider === "gmail") {
    return refreshGoogleAccessToken({
      connectionId: input.connectionId,
      refreshToken: token.refreshToken,
    });
  }
  return refreshMicrosoftAccessToken({
    connectionId: input.connectionId,
    refreshToken: token.refreshToken,
  });
}

export async function sendConnectedEmail(
  input: EmailDeliveryInput,
): Promise<EmailDeliveryResult> {
  let connection;
  try {
    connection = await ConnectorRepository.getConnectedEmailConnection({
      userId: input.userId,
      workspaceId: input.workspaceId,
      provider: input.provider,
    });
  } catch (error) {
    return {
      ok: false,
      provider: input.provider ?? null,
      error: {
        code:
          error instanceof Error && error.name === "ConnectorConfigurationError"
            ? "server_configuration_required"
            : "connection_lookup_failed",
        message: "Server configuration required.",
      },
    };
  }

  if (!connection) {
    return {
      ok: false,
      provider: input.provider ?? null,
      error: {
        code: "email_connection_required",
        message: "Connect Gmail or Outlook before sending estimates.",
      },
    };
  }

  const provider = connection.provider as EmailConnectorProvider;
  try {
    const accessToken = await getFreshToken({
      connectionId: connection.id,
      provider,
    });
    const delivery =
      provider === "gmail"
        ? await sendGmailMessage({ ...input, accessToken })
        : await sendOutlookMessage({ ...input, accessToken });
    await ConnectorRepository.markLastAction(connection.id);
    return {
      ok: true,
      provider,
      connectionId: connection.id,
      providerMessageId: delivery.messageId,
      deliveredAt: new Date().toISOString(),
    };
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "email_provider_send_failed";
    await ConnectorRepository.markConnectionError({
      connectionId: connection.id,
      status:
        code.includes("reauthorization") || code.includes("refresh")
          ? "reauthorization_required"
          : "error",
      code,
      message:
        provider === "gmail"
          ? "Gmail could not send the approved email."
          : "Outlook could not send the approved email.",
    });
    return {
      ok: false,
      provider,
      connectionId: connection.id,
      error: {
        code,
        message:
          provider === "gmail"
            ? "Gmail could not send the approved email."
            : "Outlook could not send the approved email.",
        retryable: true,
      },
    };
  }
}
