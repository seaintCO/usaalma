import "server-only";
import {
  buildImageFollowupPrompt,
  detectImageSize,
  type AlmaIntent,
  type AlmaPlan,
} from "@/lib/alma/brain";
import { logAlmaExecution, upsertAlmaContext } from "@/lib/alma/context";
import { MessageRepository } from "@/lib/db/repositories/message.repository";
import { AgentService } from "@/lib/services/agents/agent.service";
import { generateImageTool } from "@/lib/tools/images/generateImageTool";

/**
 * Stage 1 contract boundary for the canonical ALMA chat processor.
 *
 * This module deliberately has no runtime processor yet.  The compatibility
 * route continues to own execution until the subsequent, approved extraction
 * stages move one complete branch at a time.
 */

export type ChatRunLanguage = "en" | "es" | "auto";

export type ChatRunResponseType =
  | "text"
  | "image"
  | "image_edit_request"
  | "planned_execution"
  | "finance_analysis"
  | "tool_assisted";

export type ChatRunRoute =
  | "alma_image_generation"
  | "alma_image_followup"
  | "planned_execution"
  | "finance_analysis"
  | "image_generate"
  | "image_edit"
  | "tool_assisted"
  | "chat";

export type ChatRunTrackingContext = {
  agentId: string;
  executionId: string;
};

export type ProcessChatRunInput = {
  userId: string;
  conversationId: string;
  userMessage: string;
  language: ChatRunLanguage;
  /** Supplied by a future durable submission flow; not used in Stage 1. */
  idempotencyKey?: string;
  /** Allows a future worker to continue an already-created execution. */
  tracking?: ChatRunTrackingContext | null;
  /** Transport-independent notification hook for interactive and durable runs. */
  onProgress?: ChatRunProgressCallback;
};

export type ChatRunProgressEvent =
  | { type: "stream_started"; conversationId: string }
  | { type: "status"; message: string }
  | { type: "text_delta"; delta: string }
  | { type: "image"; content: string; mimeType?: string }
  | { type: "completed"; result: ChatRunSuccessResult }
  | { type: "failed"; error: ChatRunFailureResult };

export type ChatRunProgressCallback = (
  event: ChatRunProgressEvent,
) => void | Promise<void>;

export type ChatRunSuccessResult = {
  ok: true;
  responseType: ChatRunResponseType;
  route: ChatRunRoute;
  finalContent: string;
  assistantMessageId?: string;
  tracking: ChatRunTrackingContext | null;
  image?: {
    mimeType?: string;
    generated: boolean;
  };
  tools?: {
    calls: number;
    names: string[];
  };
};

export type ChatRunFailureResult = {
  ok: false;
  responseType: ChatRunResponseType;
  route: ChatRunRoute;
  finalContent?: string;
  tracking: ChatRunTrackingContext | null;
  code:
    | "memory_persistence_failed"
    | "image_generation_failed"
    | "model_request_failed"
    | "stream_failed"
    | "tool_execution_failed"
    | "unknown";
  message: string;
};

export type ChatRunResult = ChatRunSuccessResult | ChatRunFailureResult;

export type ImageExecutionKind =
  | "alma_image_generation"
  | "alma_image_followup"
  | "router_image_generate"
  | "router_image_edit";

export type ProcessImageChatRunInput = {
  userId: string;
  conversationId: string;
  userMessage: string;
  almaIntent: AlmaIntent;
  almaPlan: AlmaPlan;
  almaContext: unknown;
  routeIntent?: unknown;
  tracking?: ChatRunTrackingContext | null;
  idempotencyKey?: string;
  onProgress?: ChatRunProgressCallback;
};

/**
 * This keeps the compatibility route from interpreting image intents itself.
 * It is deliberately pure so the route can decide whether to open its current
 * plaintext stream before image execution starts.
 */
export function resolveImageExecutionKind(input: {
  almaIntent?: unknown;
  routeIntent?: unknown;
}): ImageExecutionKind | null {
  if (input.almaIntent === "image_generation") return "alma_image_generation";
  if (input.almaIntent === "image_followup") return "alma_image_followup";
  if (input.routeIntent === "image_generate") return "router_image_generate";
  if (input.routeIntent === "image_edit") return "router_image_edit";
  return null;
}

export async function startChatRunTracking(input: {
  userId: string;
  conversationId: string;
  intent: string;
  goal: string;
  plan: Record<string, unknown>;
}): Promise<ChatRunTrackingContext | null> {
  try {
    const tracked = await AgentService.startExecution({
      userId: input.userId,
      conversationId: input.conversationId,
      triggerType: "chat",
      intent: input.intent,
      goal: input.goal,
      plan: input.plan,
    });
    await AgentService.recordStep({
      executionId: tracked.execution.id,
      sequence: 1,
      kind: "plan",
      input: input.plan,
    });
    return { agentId: tracked.agent.id, executionId: tracked.execution.id };
  } catch {
    // Compatibility adapter: chat remains available before Phase 1 is deployed.
    return null;
  }
}

export async function completeChatRunTracking(input: {
  tracked: ChatRunTrackingContext | null;
  userId: string;
  success: boolean;
  summary: string;
  result?: Record<string, unknown>;
  error?: string | null;
}) {
  if (!input.tracked) return;
  try {
    await AgentService.completeExecution({
      agentId: input.tracked.agentId,
      executionId: input.tracked.executionId,
      userId: input.userId,
      success: input.success,
      summary: input.summary,
      result: input.result,
      error: input.error,
    });
  } catch {
    // Telemetry failure must never alter the chat response.
  }
}

async function emitProgress(
  callback: ChatRunProgressCallback | undefined,
  event: ChatRunProgressEvent,
) {
  if (!callback) return;
  try {
    await callback(event);
  } catch (error) {
    // A disconnected interactive transport must not interrupt durable work.
    console.error("ALMA_CHAT_PROGRESS_ERROR", error);
  }
}

/**
 * Executes every existing image branch. It does not know about Request,
 * Response, or browser streams; callers may provide progress events or await
 * the persisted terminal result without one.
 */
export async function processImageChatRun(
  input: ProcessImageChatRunInput,
): Promise<ChatRunResult | null> {
  const kind = resolveImageExecutionKind(input);
  if (!kind) return null;

  const tracked = input.tracking ?? await startChatRunTracking({
    userId: input.userId,
    conversationId: input.conversationId,
    intent: input.almaIntent,
    goal: input.userMessage,
    plan: input.almaPlan,
  });
  let assistantPersisted = false;

  const persistAssistant = async (content: string) => {
    if (assistantPersisted) return;
    await MessageRepository.create(input.conversationId, input.userId, "assistant", content);
    assistantPersisted = true;
  };

  const finishSuccess = async (
    result: Omit<ChatRunSuccessResult, "ok" | "tracking">,
    summary: string,
    trackingResult: Record<string, unknown>,
  ) => {
    const completed: ChatRunSuccessResult = { ok: true, tracking: tracked, ...result };
    await completeChatRunTracking({
      tracked,
      userId: input.userId,
      success: true,
      summary,
      result: trackingResult,
    });
    await emitProgress(input.onProgress, { type: "completed", result: completed });
    return completed;
  };

  const finishFailure = async (
    result: Omit<ChatRunFailureResult, "ok" | "tracking">,
    summary: string,
  ) => {
    const failed: ChatRunFailureResult = { ok: false, tracking: tracked, ...result };
    await completeChatRunTracking({
      tracked,
      userId: input.userId,
      success: false,
      summary,
      error: failed.message,
    });
    await emitProgress(input.onProgress, { type: "failed", error: failed });
    return failed;
  };

  if (kind === "router_image_edit") {
    const reply = "Sube la imagen que quieres editar o dime cuál imagen de tu galería quieres cambiar. Luego puedo hacer cambios como fondo, estilo, color, realismo, formato 16:9 o 9:16.";
    await persistAssistant(reply);
    await emitProgress(input.onProgress, { type: "text_delta", delta: reply });
    return finishSuccess(
      {
        responseType: "image_edit_request",
        route: "image_edit",
        finalContent: reply,
      },
      "ALMA requested an image for editing.",
      { route: "image_edit" },
    );
  }

  const isAlmaImage = kind === "alma_image_generation" || kind === "alma_image_followup";
  const responseRoute: ChatRunRoute = kind === "router_image_generate"
    ? "image_generate"
    : kind === "alma_image_followup"
      ? "alma_image_followup"
      : "alma_image_generation";
  const imagePrompt = kind === "alma_image_followup"
    ? buildImageFollowupPrompt(input.userMessage, input.almaContext)
    : input.userMessage;
  // The Alma planner path has always honored requested aspect ratios; the
  // legacy router image path deliberately calls the tool with its default.
  const imageSize = kind === "router_image_generate"
    ? undefined
    : detectImageSize(input.userMessage);

  if (kind === "router_image_generate") {
    await emitProgress(input.onProgress, {
      type: "status",
      message: "Generando imagen premium...\n\n",
    });
  }

  try {
    const result = await generateImageTool(input.userId, imagePrompt, imageSize);
    const resultError = (result as { error?: string })?.error;
    const reply = result?.success && result?.image?.outputBase64
      ? `[ALMA_IMAGE:${result.image.outputBase64}]`
      : result?.message || resultError || "No se pudo generar la imagen.";

    if (isAlmaImage) {
      await upsertAlmaContext(input.userId, input.conversationId, {
        last_intent: input.almaIntent,
        last_image_prompt: imagePrompt,
        last_image_size: imageSize,
        last_prompt: input.userMessage,
        metadata: { tool: "creative", mode: input.almaIntent },
      });
      await logAlmaExecution({
        userId: input.userId,
        conversationId: input.conversationId,
        userMessage: input.userMessage,
        intent: input.almaIntent,
        plan: { ...input.almaPlan, imagePrompt, imageSize },
        toolUsed: "generateImageTool",
        result: { success: result?.success },
        success: Boolean(result?.success),
      });
    }

    await persistAssistant(reply);
    await emitProgress(input.onProgress, result?.success && result?.image?.outputBase64
      ? { type: "image", content: reply }
      : { type: "text_delta", delta: reply });

    if (result?.success) {
      return finishSuccess(
        {
          responseType: "image",
          route: responseRoute,
          finalContent: reply,
          image: { generated: Boolean(result?.image?.outputBase64) },
        },
        "ALMA completed image generation.",
        kind === "router_image_generate"
          ? { route: "image_generate", success: true }
          : { intent: input.almaIntent, success: true },
      );
    }

    return finishFailure(
      {
        responseType: "image",
        route: responseRoute,
        finalContent: reply,
        code: "image_generation_failed",
        message: result?.message || resultError || "Image generation failed",
      },
      "ALMA could not complete image generation.",
    );
  } catch (error) {
    console.error("ALMA_IMAGE_ERROR", error);
    const errorMessage = error instanceof Error ? error.message : "error desconocido";
    const reply = isAlmaImage
      ? `ALMA tuvo un error generando la imagen: ${errorMessage}`
      : "ALMA tuvo un error generando la imagen.";

    if (!assistantPersisted) {
      await persistAssistant(reply);
      await emitProgress(input.onProgress, { type: "text_delta", delta: reply });
    }

    return finishFailure(
      {
        responseType: "image",
        route: responseRoute,
        finalContent: reply,
        code: "image_generation_failed",
        message: errorMessage,
      },
      "ALMA image generation failed.",
    );
  }
}
