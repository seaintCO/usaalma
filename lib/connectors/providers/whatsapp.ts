import crypto from "crypto";
import { getAppBaseUrl, getWhatsAppCallbackUrl } from "@/lib/connectors/config";
import { ConnectorRepository } from "@/lib/connectors/repository";
import type {
  WhatsAppSendInput,
  WhatsAppSendResult,
} from "@/lib/connectors/types";

const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v23.0";

export function normalizeWhatsAppPhone(value: string) {
  return value.replace(/[^\d+]/g, "").replace(/^\+?/, "+");
}

export function buildEmbeddedSignupUrl(state: string) {
  const appId = process.env.META_APP_ID;
  const configId = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID;
  if (!appId || !configId) return null;
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: getWhatsAppCallbackUrl(),
    state,
    config_id: configId,
    response_type: "code",
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

export function verifyWhatsAppWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | null;
}) {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !input.signatureHeader?.startsWith("sha256=")) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(input.rawBody)
    .digest("hex");
  const received = input.signatureHeader.slice("sha256=".length);
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");
  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export function verifyWhatsAppChallenge(url: URL) {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (
    mode === "subscribe" &&
    token &&
    token === process.env.META_WEBHOOK_VERIFY_TOKEN &&
    challenge
  ) {
    return challenge;
  }
  return null;
}

export function chooseWhatsAppMessagePolicy(input: {
  lastInboundAt?: string | null;
  templateName?: string | null;
}) {
  if (input.templateName) return { allowed: true, requiresTemplate: false };
  if (!input.lastInboundAt) return { allowed: false, requiresTemplate: true };
  const ageMs = Date.now() - new Date(input.lastInboundAt).getTime();
  return {
    allowed: ageMs >= 0 && ageMs <= 24 * 60 * 60 * 1000,
    requiresTemplate: ageMs > 24 * 60 * 60 * 1000,
  };
}

async function graph(path: string, init: RequestInit = {}) {
  return fetch(`https://graph.facebook.com/${GRAPH_VERSION}${path}`, init);
}

export async function exchangeWhatsAppCode(code: string) {
  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
    throw new Error("meta_configuration_required");
  }
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    redirect_uri: getWhatsAppCallbackUrl(),
    code,
  });
  const response = await graph(`/oauth/access_token?${params.toString()}`);
  if (!response.ok) throw new Error("meta_code_exchange_failed");
  return (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };
}

export async function fetchWhatsAppPhoneMetadata(accessToken: string) {
  const response = await graph(
    "/me?fields=id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!response.ok) throw new Error("meta_business_lookup_failed");
  const payload = (await response.json()) as {
    name?: string;
    owned_whatsapp_business_accounts?: {
      data?: Array<{
        id: string;
        name?: string;
        phone_numbers?: {
          data?: Array<{
            id: string;
            display_phone_number?: string;
            verified_name?: string;
          }>;
        };
      }>;
    };
  };
  const waba = payload.owned_whatsapp_business_accounts?.data?.[0];
  const phone = waba?.phone_numbers?.data?.[0];
  if (!waba?.id || !phone?.id) throw new Error("meta_phone_number_missing");
  return {
    wabaId: waba.id,
    phoneNumberId: phone.id,
    displayPhoneNumber: phone.display_phone_number ?? null,
    businessName: phone.verified_name ?? waba.name ?? payload.name ?? null,
  };
}

export async function sendWhatsAppMessage(
  input: WhatsAppSendInput,
): Promise<WhatsAppSendResult> {
  const connection = await ConnectorRepository.getConnectedWhatsAppConnection({
    userId: input.userId,
    workspaceId: input.workspaceId,
  });
  if (!connection || connection.id !== input.connectionId) {
    return {
      ok: false,
      error: {
        code: "whatsapp_connection_required",
        message: "Connect WhatsApp Business before sending.",
      },
    };
  }
  const secret = await ConnectorRepository.readAccessToken(connection.id);
  if (!secret.accessToken) {
    return {
      ok: false,
      error: {
        code: "whatsapp_token_missing",
        message: "Reconnect WhatsApp Business before sending.",
      },
    };
  }
  const meta = connection as typeof connection & {
    provider_metadata?: { phoneNumberId?: string };
  };
  const phoneNumberId =
    meta.provider_metadata?.phoneNumberId ?? connection.provider_account_id;
  if (!phoneNumberId) {
    return {
      ok: false,
      error: {
        code: "whatsapp_phone_missing",
        message: "Connected WhatsApp phone number is unavailable.",
      },
    };
  }
  const body = input.templateName
    ? {
        messaging_product: "whatsapp",
        to: normalizeWhatsAppPhone(input.toPhone),
        type: "template",
        template: {
          name: input.templateName,
          language: { code: input.language === "es" ? "es_MX" : "en_US" },
        },
      }
    : {
        messaging_product: "whatsapp",
        to: normalizeWhatsAppPhone(input.toPhone),
        type: "text",
        text: { body: input.body, preview_url: false },
      };
  const response = await graph(`/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    return {
      ok: false,
      error: {
        code: "whatsapp_send_failed",
        message: "WhatsApp did not accept the message.",
      },
    };
  }
  const payload = (await response.json()) as {
    messages?: Array<{ id?: string; message_status?: string }>;
  };
  await ConnectorRepository.markLastAction(connection.id);
  return {
    ok: true,
    providerMessageId: payload.messages?.[0]?.id ?? null,
    status: payload.messages?.[0]?.message_status ?? "accepted",
  };
}

export function webhookUrl() {
  return `${getAppBaseUrl()}/api/connectors/whatsapp/webhook`;
}
