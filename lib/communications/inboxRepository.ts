import { createAdminClient } from "@/lib/supabase/admin";

export class CommunicationInboxUnavailableError extends Error {
  constructor(message = "Communication inbox storage is unavailable.") {
    super(message);
    this.name = "CommunicationInboxUnavailableError";
  }
}

function admin() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new CommunicationInboxUnavailableError();
  }
  return createAdminClient();
}

function missingTable(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    ["42P01", "42703"].includes(String(error.code))
  );
}

export async function listCommunicationThreads(userId: string) {
  try {
    const supabase = admin();
    const { data, error } = await supabase
      .from("communication_threads")
      .select(
        "id,workspace_id,channel,provider,customer_display_name,contact_address,detected_language,unread_count,last_activity_at,delivery_state",
      )
      .eq("user_id", userId)
      .order("last_activity_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    if (
      missingTable(error) ||
      error instanceof CommunicationInboxUnavailableError
    ) {
      return [];
    }
    throw error;
  }
}

export async function getThreadForUser(input: {
  userId: string;
  threadId: string;
}) {
  const supabase = admin();
  const { data, error } = await supabase
    .from("communication_threads")
    .select("*")
    .eq("user_id", input.userId)
    .eq("id", input.threadId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createOrUpdateWhatsAppThread(input: {
  userId: string;
  workspaceId: string;
  contactAddress: string;
  displayName?: string | null;
  detectedLanguage?: string | null;
  providerThreadId?: string | null;
}) {
  const supabase = admin();
  const { data, error } = await supabase
    .from("communication_threads")
    .upsert(
      {
        user_id: input.userId,
        workspace_id: input.workspaceId,
        channel: "whatsapp",
        provider: "whatsapp_business",
        provider_thread_id: input.providerThreadId ?? input.contactAddress,
        customer_display_name: input.displayName ?? input.contactAddress,
        contact_address: input.contactAddress,
        detected_language: input.detectedLanguage ?? null,
        unread_count: 1,
        last_inbound_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,channel,contact_address" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as { id: string; workspace_id: string };
}

export async function insertCommunicationMessage(input: {
  userId: string;
  workspaceId: string;
  threadId: string;
  channel: "whatsapp" | "email";
  direction: "inbound" | "outbound";
  providerMessageId?: string | null;
  providerStatus?: string | null;
  messageType?: string;
  originalText?: string | null;
  translatedText?: string | null;
  detectedLanguage?: string | null;
  mediaMetadata?: Record<string, unknown>;
  providerPayload?: Record<string, unknown>;
}) {
  const supabase = admin();
  const { data, error } = await supabase
    .from("communication_messages")
    .upsert(
      {
        user_id: input.userId,
        workspace_id: input.workspaceId,
        thread_id: input.threadId,
        channel: input.channel,
        direction: input.direction,
        provider_message_id: input.providerMessageId ?? null,
        provider_status: input.providerStatus ?? null,
        message_type: input.messageType ?? "text",
        original_text: input.originalText ?? null,
        translated_text: input.translatedText ?? null,
        detected_language: input.detectedLanguage ?? null,
        media_metadata: input.mediaMetadata ?? {},
        provider_payload: input.providerPayload ?? {},
      },
      { onConflict: "workspace_id,channel,provider_message_id" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function createWhatsAppDeliveryRecord(input: {
  userId: string;
  workspaceId: string;
  approvalId: string;
  threadId?: string | null;
  connectionId: string;
  recipientPhone: string;
}) {
  const supabase = admin();
  const { data: existing, error: existingError } = await supabase
    .from("whatsapp_delivery_records")
    .select("*")
    .eq("approval_id", input.approvalId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;
  const { data, error } = await supabase
    .from("whatsapp_delivery_records")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId,
      approval_id: input.approvalId,
      thread_id: input.threadId ?? null,
      connection_id: input.connectionId,
      recipient_phone: input.recipientPhone,
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateWhatsAppDelivery(input: {
  deliveryId: string;
  status: string;
  providerMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}) {
  const supabase = admin();
  const { error } = await supabase
    .from("whatsapp_delivery_records")
    .update({
      status: input.status,
      provider_message_id: input.providerMessageId ?? null,
      error_code: input.errorCode ?? null,
      error_message: input.errorMessage?.slice(0, 240) ?? null,
      sent_at: input.status === "accepted" ? new Date().toISOString() : null,
    })
    .eq("id", input.deliveryId);
  if (error) throw error;
}

export async function recordWebhookEvent(input: {
  providerEventId: string;
  eventType: string;
  workspaceId?: string | null;
  connectionId?: string | null;
  payload: Record<string, unknown>;
}) {
  const supabase = admin();
  const { data: existing } = await supabase
    .from("whatsapp_webhook_events")
    .select("id")
    .eq("provider_event_id", input.providerEventId)
    .maybeSingle();
  if (existing) return false;
  const { error } = await supabase.from("whatsapp_webhook_events").insert({
    provider_event_id: input.providerEventId,
    workspace_id: input.workspaceId ?? null,
    connection_id: input.connectionId ?? null,
    event_type: input.eventType,
    processed_at: new Date().toISOString(),
    payload: input.payload,
  });
  if (error) throw error;
  return true;
}
