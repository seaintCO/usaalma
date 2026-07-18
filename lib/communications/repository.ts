import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CommunicationLanguageCode,
  CommunicationOperation,
  CommunicationTone,
} from "./languages";
import type {
  CommunicationGlossaryTerm,
  CommunicationResult,
} from "./translationService";

export class CommunicationRepositoryUnavailableError extends Error {
  constructor(message = "Communication storage is unavailable.") {
    super(message);
    this.name = "CommunicationRepositoryUnavailableError";
  }
}

function admin() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new CommunicationRepositoryUnavailableError();
  }
  return createAdminClient();
}

function isMissingTable(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    ["42P01", "42703"].includes(String(error.code))
  );
}

export async function listWorkspaceGlossary(input: {
  userId: string;
  workspaceId: string | null;
}): Promise<CommunicationGlossaryTerm[]> {
  try {
    const supabase = admin();
    let query = supabase
      .from("communication_glossary_terms")
      .select("source_term,target_term,notes")
      .eq("user_id", input.userId)
      .eq("active", true)
      .limit(200);
    query = input.workspaceId
      ? query.eq("workspace_id", input.workspaceId)
      : query.is("workspace_id", null);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row) => ({
      source: String(row.source_term ?? ""),
      target: typeof row.target_term === "string" ? row.target_term : null,
      notes: typeof row.notes === "string" ? row.notes : null,
    }));
  } catch (error) {
    if (isMissingTable(error)) return [];
    if (error instanceof CommunicationRepositoryUnavailableError) return [];
    throw error;
  }
}

export async function recordTranslationJob(input: {
  userId: string;
  workspaceId: string | null;
  operation: CommunicationOperation;
  tone: CommunicationTone;
  channel: string;
  result: CommunicationResult;
}) {
  try {
    const supabase = admin();
    const { error } = await supabase
      .from("communication_translation_jobs")
      .insert({
        user_id: input.userId,
        workspace_id: input.workspaceId,
        operation: input.operation,
        source_language: input.result.detectedLanguage,
        target_language: input.result.targetLanguage,
        tone: input.tone,
        channel: input.channel,
        original_text: input.result.originalText,
        corrected_text: input.result.correctedSource,
        translated_text: input.result.translation,
        warnings: input.result.warnings,
        provider: input.result.provider,
        status: "completed",
      });
    if (error) throw error;
  } catch (error) {
    if (
      isMissingTable(error) ||
      error instanceof CommunicationRepositoryUnavailableError
    ) {
      return;
    }
    throw error;
  }
}

export async function upsertWorkspaceLanguagePreference(input: {
  userId: string;
  workspaceId: string | null;
  preferredLanguage: CommunicationLanguageCode;
  translationLanguage: CommunicationLanguageCode;
}) {
  const supabase = admin();
  const { error } = await supabase
    .from("workspace_language_preferences")
    .upsert(
      {
        user_id: input.userId,
        workspace_id: input.workspaceId,
        preferred_language: input.preferredLanguage,
        translation_language: input.translationLanguage,
      },
      { onConflict: "user_id,workspace_id" },
    );
  if (error) throw error;
}
