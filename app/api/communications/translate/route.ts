import { NextResponse } from "next/server";
import {
  CommunicationProviderError,
  CommunicationProviderUnavailableError,
  CommunicationValidationError,
  runCommunicationOperation,
} from "@/lib/communications/translationService";
import {
  normalizeCommunicationLanguage,
  normalizeTone,
  type CommunicationOperation,
} from "@/lib/communications/languages";
import {
  listWorkspaceGlossary,
  recordTranslationJob,
} from "@/lib/communications/repository";
import { getCurrentUser } from "@/lib/auth/user";
import { EntitlementService } from "@/lib/platform/entitlements/service";
import { resolveTenantWorkspace } from "@/lib/platform/workspace/tenantResolver";
import { modeConfiguration } from "@/lib/usage/modes";
import { withUsageReservation } from "@/lib/usage/service";
import { UsageLimitError } from "@/lib/usage/service";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

const OPERATIONS = new Set<CommunicationOperation>([
  "detect_language",
  "correct_grammar",
  "translate_text",
  "correct_and_translate",
  "rewrite_for_tone",
  "shorten_for_channel",
  "generate_bilingual_reply",
  "summarize_conversation",
  "prepare_external_message",
]);

async function post(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_json" } },
      { status: 400 },
    );
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const operation = OPERATIONS.has(body.operation as CommunicationOperation)
    ? (body.operation as CommunicationOperation)
    : "correct_and_translate";
  if (!text) {
    return NextResponse.json(
      { ok: false, error: { code: "text_required" } },
      { status: 400 },
    );
  }
  if (text.length > 12000) {
    return NextResponse.json(
      { ok: false, error: { code: "text_too_long" } },
      { status: 413 },
    );
  }

  const entitlement = await EntitlementService.checkModuleAccess(
    user.id,
    "communications",
  );
  if (entitlement && entitlement.accessStatus !== "included") {
    return NextResponse.json(
      { ok: false, error: { code: "entitlement_required" } },
      { status: 403 },
    );
  }

  const workspaceId =
    typeof body.workspaceId === "string" ? body.workspaceId : null;
  const tenant = await resolveTenantWorkspace({ userId: user.id, workspaceId });
  const glossary = await listWorkspaceGlossary({
    userId: user.id,
    workspaceId: tenant.workspaceId,
  });
  const source =
    body.sourceLanguage === "auto"
      ? "auto"
      : normalizeCommunicationLanguage(body.sourceLanguage, "en");
  const target = normalizeCommunicationLanguage(body.targetLanguage, "es");
  const tone = normalizeTone(body.tone);
  const channel = typeof body.channel === "string" ? body.channel : "chat";

  let result;
  try {
    const configured = modeConfiguration("instant");
    result = await withUsageReservation(
      {
        userId: user.id,
        feature: "ai_request",
        mode: "instant",
        model: configured.model,
        units: { requests: 1 },
        idempotencyKey: `translation:${req.headers.get("x-idempotency-key") ?? crypto.randomUUID()}`,
      },
      () =>
        runCommunicationOperation({
          operation,
          text,
          sourceLanguage: source,
          targetLanguage: target,
          tone,
          channel: channel as
            "email" | "whatsapp" | "chat" | "office" | "translator",
          glossary,
        }),
    );
  } catch (error) {
    if (error instanceof UsageLimitError) throw error;
    if (error instanceof CommunicationProviderUnavailableError) {
      return NextResponse.json(
        { ok: false, error: { code: error.code } },
        { status: 503 },
      );
    }
    if (error instanceof CommunicationValidationError) {
      return NextResponse.json(
        { ok: false, error: { code: error.code, reasons: error.reasons } },
        { status: 502 },
      );
    }
    if (error instanceof CommunicationProviderError) {
      const status = error.status === 429 ? 429 : 502;
      return NextResponse.json(
        { ok: false, error: { code: error.code } },
        { status },
      );
    }
    return NextResponse.json(
      { ok: false, error: { code: "translation_failed" } },
      { status: 502 },
    );
  }

  await recordTranslationJob({
    userId: user.id,
    workspaceId: tenant.workspaceId,
    operation,
    tone,
    channel,
    result,
  });

  return NextResponse.json({ ok: true, result });
}
export const POST = withUsageRoute(post);
