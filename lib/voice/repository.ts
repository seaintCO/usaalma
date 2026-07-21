import { createAdminClient } from "@/lib/supabase/admin";
import { settleUsageById } from "@/lib/usage/service";

export class VoiceStorageUnavailableError extends Error {
  constructor(message = "Voice storage is unavailable.") {
    super(message);
    this.name = "VoiceStorageUnavailableError";
  }
}

function admin() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new VoiceStorageUnavailableError();
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

export async function createVoiceSessionRecord(input: {
  userId: string;
  workspaceId: string | null;
  mode: "alma_voice" | "translator";
  model: string;
  language: string;
  usageReservationId: string;
}) {
  try {
    const supabase = admin();
    const { data, error } = await supabase
      .from("voice_sessions")
      .insert({
        user_id: input.userId,
        workspace_id: input.workspaceId,
        mode: input.mode,
        model: input.model,
        preferred_language: input.language,
        status: "active",
        usage_reservation_id: input.usageReservationId,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  } catch (error) {
    if (missingTable(error) || error instanceof VoiceStorageUnavailableError) {
      return null;
    }
    throw error;
  }
}

export async function completeVoiceSessionRecord(input: {
  userId: string;
  sessionId: string;
  maxSeconds?: number;
}) {
  const supabase = admin();
  const { data: session, error } = await supabase
    .from("voice_sessions")
    .select("id,status,created_at,usage_reservation_id")
    .eq("id", input.sessionId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (error) throw error;
  if (!session) return null;
  if (session.status !== "active") return { seconds: 0, duplicate: true };
  const seconds = Math.max(
    1,
    Math.min(
      input.maxSeconds ?? 900,
      Math.ceil((Date.now() - new Date(session.created_at).getTime()) / 1000),
    ),
  );
  if (session.usage_reservation_id)
    await settleUsageById(session.usage_reservation_id, {
      voiceSeconds: seconds,
    });
  const { error: updateError } = await supabase
    .from("voice_sessions")
    .update({ status: "completed", ended_at: new Date().toISOString() })
    .eq("id", session.id)
    .eq("user_id", input.userId)
    .eq("status", "active");
  if (updateError) throw updateError;
  return { seconds, duplicate: false };
}

export async function recordVoiceTranscript(input: {
  userId: string;
  workspaceId: string | null;
  sessionId?: string | null;
  source: "translator" | "alma_voice";
  transcript: string;
  translation?: string | null;
  sourceLanguage?: string | null;
  targetLanguage?: string | null;
}) {
  try {
    const supabase = admin();
    const { error } = await supabase.from("voice_transcripts").insert({
      user_id: input.userId,
      workspace_id: input.workspaceId,
      session_id: input.sessionId ?? null,
      source: input.source,
      transcript: input.transcript,
      translation: input.translation ?? null,
      source_language: input.sourceLanguage ?? null,
      target_language: input.targetLanguage ?? null,
    });
    if (error) throw error;
  } catch (error) {
    if (missingTable(error) || error instanceof VoiceStorageUnavailableError) {
      return;
    }
    throw error;
  }
}

export async function listMemoryCandidates(userId: string) {
  try {
    const supabase = admin();
    const { data, error } = await supabase
      .from("conversation_memory_candidates")
      .select(
        "id,workspace_id,source,summary,memory_key,memory_value,status,created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    if (missingTable(error) || error instanceof VoiceStorageUnavailableError) {
      return [];
    }
    throw error;
  }
}
