import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runCommunicationOperation } from "@/lib/communications/translationService";
import {
  createOrUpdateWhatsAppThread,
  insertCommunicationMessage,
  recordWebhookEvent,
  updateWhatsAppDelivery,
} from "@/lib/communications/inboxRepository";
import {
  normalizeWhatsAppPhone,
  verifyWhatsAppChallenge,
  verifyWhatsAppWebhookSignature,
} from "@/lib/connectors/providers/whatsapp";

type WhatsAppWebhookMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string; caption?: string; mime_type?: string };
  audio?: { id?: string; mime_type?: string; voice?: boolean };
  document?: {
    id?: string;
    filename?: string;
    caption?: string;
    mime_type?: string;
  };
};

type WhatsAppWebhookStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: Array<{ code?: number; title?: string; message?: string }>;
};

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string; display_phone_number?: string };
        contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
        messages?: WhatsAppWebhookMessage[];
        statuses?: WhatsAppWebhookStatus[];
      };
    }>;
  }>;
};

export async function GET(req: Request) {
  const challenge = verifyWhatsAppChallenge(new URL(req.url));
  if (!challenge) return new Response("Forbidden", { status: 403 });
  return new Response(challenge, { status: 200 });
}

async function findConnection(phoneNumberId: string) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null;
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("provider_connections")
    .select("id,user_id,workspace_id,provider_account_id")
    .eq("provider", "whatsapp_business")
    .eq("provider_account_id", phoneNumberId)
    .eq("connection_status", "connected")
    .maybeSingle();
  if (error) throw error;
  return data as {
    id: string;
    user_id: string;
    workspace_id: string;
    provider_account_id: string;
  } | null;
}

async function updateStatus(status: WhatsAppWebhookStatus) {
  if (
    !status.id ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return;
  }
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("whatsapp_delivery_records")
    .select("id")
    .eq("provider_message_id", status.id)
    .maybeSingle();
  if (!data?.id) return;
  await updateWhatsAppDelivery({
    deliveryId: data.id as string,
    status: status.status ?? "sent",
    providerMessageId: status.id,
    errorCode: status.errors?.[0]?.code ? String(status.errors[0].code) : null,
    errorMessage:
      status.errors?.[0]?.message ?? status.errors?.[0]?.title ?? null,
  });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  if (
    process.env.META_APP_SECRET &&
    !verifyWhatsAppWebhookSignature({
      rawBody,
      signatureHeader: req.headers.get("x-hub-signature-256"),
    })
  ) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_signature" } },
      { status: 401 },
    );
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_json" } },
      { status: 400 },
    );
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!value || !phoneNumberId) continue;
      const connection = await findConnection(phoneNumberId);
      if (!connection) continue;

      for (const status of value.statuses ?? []) {
        if (!status.id) continue;
        const fresh = await recordWebhookEvent({
          providerEventId: `status:${status.id}:${status.status ?? "unknown"}`,
          eventType: "status",
          workspaceId: connection.workspace_id,
          connectionId: connection.id,
          payload: status as Record<string, unknown>,
        });
        if (fresh) await updateStatus(status);
      }

      for (const message of value.messages ?? []) {
        if (!message.id || !message.from) continue;
        const fresh = await recordWebhookEvent({
          providerEventId: `message:${message.id}`,
          eventType: message.type ?? "message",
          workspaceId: connection.workspace_id,
          connectionId: connection.id,
          payload: {
            id: message.id,
            from: message.from,
            type: message.type,
            timestamp: message.timestamp,
          },
        });
        if (!fresh) continue;
        const contact = value.contacts?.find(
          (entry) => entry.wa_id === message.from,
        );
        const text =
          message.text?.body ??
          message.image?.caption ??
          message.document?.caption ??
          "";
        const translation = text
          ? await runCommunicationOperation({
              operation: "translate_text",
              text,
              sourceLanguage: "auto",
              targetLanguage: "en",
              channel: "whatsapp",
            })
          : null;
        const thread = await createOrUpdateWhatsAppThread({
          userId: connection.user_id,
          workspaceId: connection.workspace_id,
          contactAddress: normalizeWhatsAppPhone(message.from),
          displayName: contact?.profile?.name ?? null,
          detectedLanguage: translation?.detectedLanguage ?? null,
          providerThreadId: message.from,
        });
        await insertCommunicationMessage({
          userId: connection.user_id,
          workspaceId: connection.workspace_id,
          threadId: thread.id,
          channel: "whatsapp",
          direction: "inbound",
          providerMessageId: message.id,
          providerStatus: "received",
          messageType: message.type ?? "text",
          originalText: text || null,
          translatedText: translation?.translation ?? null,
          detectedLanguage: translation?.detectedLanguage ?? null,
          mediaMetadata: {
            image: message.image?.id ?? null,
            audio: message.audio?.id ?? null,
            document: message.document?.id ?? null,
            filename: message.document?.filename ?? null,
          },
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
