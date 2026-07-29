import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { ConnectorRepository } from "@/lib/connectors/repository";
import { createAdminClient } from "@/lib/supabase/admin";
import { createElevenLabsClient } from "@/lib/voice-agents/elevenlabs";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function string(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function phoneFrom(data: JsonObject, key: "from" | "to") {
  const metadata = object(data.metadata);
  const phoneCall = object(metadata.phone_call ?? metadata.phoneCall);
  const initiation = object(data.conversation_initiation_client_data);
  const dynamic = object(initiation.dynamic_variables);
  const candidates =
    key === "from"
      ? [
          phoneCall.from_number,
          phoneCall.from,
          dynamic.system__caller_id,
          dynamic.caller_phone,
        ]
      : [
          phoneCall.to_number,
          phoneCall.to,
          dynamic.system__called_number,
          dynamic.called_phone,
        ];
  return candidates.map(string).find(Boolean) ?? null;
}

function transcriptText(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value
    .map((turn) => {
      const row = object(turn);
      const speaker = string(row.role || row.speaker || "speaker");
      const message = string(row.message || row.text);
      return message ? `${speaker}: ${message}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function normalizePhone(value: string | null) {
  if (!value) return "";
  return value.replace(/[^\d+]/g, "");
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("elevenlabs-signature") ?? "";
  if (!rawBody || !signature) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_webhook" } },
      { status: 400 },
    );
  }
  let unverified: JsonObject;
  try {
    unverified = object(JSON.parse(rawBody) as unknown);
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_webhook_json" } },
      { status: 400 },
    );
  }
  const unverifiedData = object(unverified.data);
  const externalAgentId = string(
    unverifiedData.agent_id ?? unverifiedData.agentId,
  );
  if (!externalAgentId) {
    return NextResponse.json(
      { ok: false, error: { code: "unknown_voice_agent" } },
      { status: 404 },
    );
  }

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("voice_agent_profiles")
    .select(
      "id,user_id,workspace_id,connection_id,external_agent_id,auto_create_leads",
    )
    .eq("external_agent_id", externalAgentId)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json(
      { ok: false, error: { code: "unknown_voice_agent" } },
      { status: 404 },
    );
  }

  let event: JsonObject;
  try {
    const secret = await ConnectorRepository.readAccessToken(
      profile.connection_id,
    );
    if (!secret.refreshToken) throw new Error("webhook_secret_missing");
    const client = createElevenLabsClient(secret.accessToken);
    event = object(
      await client.webhooks.constructEvent(
        rawBody,
        signature,
        secret.refreshToken,
      ),
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_webhook_signature" } },
      { status: 401 },
    );
  }

  const eventType = string(event.type);
  const data = object(event.data);
  const conversationId = string(data.conversation_id ?? data.conversationId);
  const timestamp = String(event.event_timestamp ?? event.eventTimestamp ?? "");
  const providerEventId = createHash("sha256")
    .update(`${eventType}:${conversationId}:${timestamp}:${signature}`)
    .digest("hex");
  const { error: ledgerError } = await supabase
    .from("voice_webhook_events")
    .insert({
      workspace_id: profile.workspace_id,
      agent_profile_id: profile.id,
      provider_event_id: providerEventId,
      event_type: eventType || "unknown",
      provider_conversation_id: conversationId || null,
      status: "received",
    });
  if (ledgerError?.code === "23505") {
    return NextResponse.json({ ok: true, duplicate: true });
  }
  if (ledgerError) {
    return NextResponse.json(
      { ok: false, error: { code: "webhook_ledger_failed" } },
      { status: 503 },
    );
  }
  if (eventType !== "post_call_transcription" || !conversationId) {
    await supabase
      .from("voice_webhook_events")
      .update({ status: "ignored", processed_at: new Date().toISOString() })
      .eq("provider_event_id", providerEventId);
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const metadata = object(data.metadata);
    const analysis = object(data.analysis);
    const callerPhone = phoneFrom(data, "from");
    const calledPhone = phoneFrom(data, "to");
    let contactId: string | null = null;
    const normalizedCaller = normalizePhone(callerPhone);
    if (normalizedCaller) {
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id,phone")
        .eq("user_id", profile.user_id)
        .limit(250);
      const match = (contacts ?? []).find(
        (contact) => normalizePhone(contact.phone) === normalizedCaller,
      );
      contactId = match?.id ?? null;
      if (!contactId && profile.auto_create_leads) {
        const { data: newContact } = await supabase
          .from("contacts")
          .insert({
            user_id: profile.user_id,
            name: callerPhone || "Voice caller",
            phone: callerPhone,
            source: "elevenlabs_voice",
            notes:
              "Created from a signed ElevenLabs post-call webhook. Consent and identity require review.",
          })
          .select("id")
          .single();
        contactId = newContact?.id ?? null;
      }
    }
    const duration = Number(
      metadata.call_duration_secs ??
        metadata.callDurationSecs ??
        data.call_duration_secs ??
        0,
    );
    const transcript = Array.isArray(data.transcript) ? data.transcript : [];
    const summary = string(
      analysis.transcript_summary ??
        analysis.transcriptSummary ??
        analysis.summary,
    );
    const outcome = string(
      analysis.call_successful ?? analysis.callSuccessful ?? analysis.outcome,
    );
    const startedAt =
      string(metadata.start_time_unix_secs) ||
      string(metadata.startTimeUnixSecs);
    const startedDate = startedAt
      ? new Date(Number(startedAt) * 1000).toISOString()
      : null;
    const endedDate =
      startedDate && Number.isFinite(duration)
        ? new Date(
            new Date(startedDate).getTime() + duration * 1000,
          ).toISOString()
        : null;
    const { data: call, error: callError } = await supabase
      .from("voice_call_records")
      .upsert(
        {
          user_id: profile.user_id,
          workspace_id: profile.workspace_id,
          agent_profile_id: profile.id,
          contact_id: contactId,
          provider_conversation_id: conversationId,
          direction: callerPhone ? "inbound" : "browser",
          caller_phone: callerPhone,
          called_phone: calledPhone,
          status: string(data.status) === "failed" ? "failed" : "completed",
          started_at: startedDate,
          ended_at: endedDate,
          duration_seconds:
            Number.isFinite(duration) && duration >= 0
              ? Math.round(duration)
              : null,
          transcript,
          transcript_text: transcriptText(transcript),
          summary: summary || null,
          outcome: outcome || null,
          sentiment: string(analysis.sentiment) || null,
          recording_available: Boolean(metadata.has_audio),
          provider_metadata: {
            providerStatus: string(data.status),
            terminationReason: string(metadata.termination_reason),
          },
        },
        { onConflict: "provider_conversation_id" },
      )
      .select("id")
      .single();
    if (callError) throw callError;
    if (contactId) {
      await supabase.from("crm_activities").insert({
        user_id: profile.user_id,
        contact_id: contactId,
        activity_type: "voice_call",
        content:
          summary ||
          `Voice call completed (${Math.max(0, Math.round(duration || 0))} seconds).`,
        occurred_at: endedDate ?? new Date().toISOString(),
      });
    }
    await supabase
      .from("voice_webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("provider_event_id", providerEventId);
    return NextResponse.json({ ok: true, callId: call.id });
  } catch {
    await supabase
      .from("voice_webhook_events")
      .update({
        status: "failed",
        safe_error_code: "post_call_processing_failed",
        processed_at: new Date().toISOString(),
      })
      .eq("provider_event_id", providerEventId);
    return NextResponse.json(
      { ok: false, error: { code: "post_call_processing_failed" } },
      { status: 503 },
    );
  }
}
