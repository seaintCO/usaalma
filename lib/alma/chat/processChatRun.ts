import "server-only";
import OpenAI from "openai";
import {
  buildImageFollowupPrompt,
  detectImageSize,
  type AlmaIntent,
  type AlmaPlan,
} from "@/lib/alma/brain";
import { logAlmaExecution, upsertAlmaContext } from "@/lib/alma/context";
import { MessageRepository } from "@/lib/db/repositories/message.repository";
import { AgentService } from "@/lib/services/agents/agent.service";
import { AgentExecutionRepository } from "@/lib/db/repositories/agents/agentExecution.repository";
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
  | { type: "failed"; error: ChatRunFailureResult | ChatRunInProgressResult };

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

export type ChatRunInProgressResult = {
  ok: false;
  responseType: "text";
  route: "chat";
  tracking: ChatRunTrackingContext;
  code: "execution_in_progress";
  message: string;
};

export type ChatRunResult =
  ChatRunSuccessResult | ChatRunFailureResult | ChatRunInProgressResult;

export type DurableChatRunInvocation = {
  invocationMode: "durable";
  userId: string;
  agentId: string;
  conversationId: string;
  executionId: string;
  userMessageId: string;
  userMessage: string;
  idempotencyKey: string;
  language: ChatRunLanguage;
  onProgress?: ChatRunProgressCallback;
};

export type InteractiveChatRunInvocation = {
  invocationMode?: "interactive";
  userId: string;
  conversationId: string;
  userMessage: string;
  idempotencyKey?: string;
  language: ChatRunLanguage;
  onProgress?: ChatRunProgressCallback;
};

export type CanonicalChatRunInvocation =
  DurableChatRunInvocation | InteractiveChatRunInvocation;

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
  idempotencyKey?: string | null;
}): Promise<ChatRunTrackingContext | null> {
  try {
    const tracked = await AgentService.startExecution({
      userId: input.userId,
      conversationId: input.conversationId,
      triggerType: "chat",
      intent: input.intent,
      goal: input.goal,
      plan: input.plan,
      idempotencyKey: input.idempotencyKey,
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

  const tracked =
    input.tracking ??
    (await startChatRunTracking({
      userId: input.userId,
      conversationId: input.conversationId,
      intent: input.almaIntent,
      goal: input.userMessage,
      plan: input.almaPlan,
      idempotencyKey: input.idempotencyKey,
    }));
  let assistantPersisted = false;

  const persistAssistant = async (content: string) => {
    if (assistantPersisted) return;
    await MessageRepository.create(
      input.conversationId,
      input.userId,
      "assistant",
      content,
      {
        executionId: tracked?.executionId,
        idempotencyKey: tracked?.executionId
          ? `assistant:${tracked.executionId}`
          : undefined,
      },
    );
    assistantPersisted = true;
  };

  const finishSuccess = async (
    result: Omit<ChatRunSuccessResult, "ok" | "tracking">,
    summary: string,
    trackingResult: Record<string, unknown>,
  ) => {
    const completed: ChatRunSuccessResult = {
      ok: true,
      tracking: tracked,
      ...result,
    };
    await completeChatRunTracking({
      tracked,
      userId: input.userId,
      success: true,
      summary,
      result: trackingResult,
    });
    await emitProgress(input.onProgress, {
      type: "completed",
      result: completed,
    });
    return completed;
  };

  const finishFailure = async (
    result: Omit<ChatRunFailureResult, "ok" | "tracking">,
    summary: string,
  ) => {
    const failed: ChatRunFailureResult = {
      ok: false,
      tracking: tracked,
      ...result,
    };
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
    const reply =
      "Sube la imagen que quieres editar o dime cuál imagen de tu galería quieres cambiar. Luego puedo hacer cambios como fondo, estilo, color, realismo, formato 16:9 o 9:16.";
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

  const isAlmaImage =
    kind === "alma_image_generation" || kind === "alma_image_followup";
  const responseRoute: ChatRunRoute =
    kind === "router_image_generate"
      ? "image_generate"
      : kind === "alma_image_followup"
        ? "alma_image_followup"
        : "alma_image_generation";
  const imagePrompt =
    kind === "alma_image_followup"
      ? buildImageFollowupPrompt(input.userMessage, input.almaContext)
      : input.userMessage;
  // The Alma planner path has always honored requested aspect ratios; the
  // legacy router image path deliberately calls the tool with its default.
  const imageSize =
    kind === "router_image_generate"
      ? undefined
      : detectImageSize(input.userMessage);

  let imageStepId: string | null = null;
  if (tracked) {
    const claimed = await AgentService.claimStep({
      executionId: tracked.executionId,
      sequence: 2,
      kind: "tool",
      toolName: "generateImageTool",
      input: { kind, imagePrompt, imageSize },
    });
    if (!claimed.claimed) {
      const output = claimed.step.output as {
        reply?: string;
        generated?: boolean;
      };
      if (claimed.step.status === "completed" && output.reply) {
        await emitProgress(
          input.onProgress,
          output.generated
            ? { type: "image", content: output.reply }
            : { type: "text_delta", delta: output.reply },
        );
        return finishSuccess(
          {
            responseType: "image",
            route: responseRoute,
            finalContent: output.reply,
            image: { generated: Boolean(output.generated) },
          },
          "ALMA reused a completed image generation.",
          { route: responseRoute, reused: true },
        );
      }
      return {
        ok: false,
        responseType: "text",
        route: "chat",
        tracking: tracked,
        code: "execution_in_progress",
        message: "This image generation is already running.",
      };
    }
    imageStepId = claimed.step.id;
  }

  if (kind === "router_image_generate") {
    await emitProgress(input.onProgress, {
      type: "status",
      message: "Generando imagen premium...\n\n",
    });
  }

  try {
    const result = await generateImageTool(
      input.userId,
      imagePrompt,
      imageSize,
    );
    const resultError = (result as { error?: string })?.error;
    const reply =
      result?.success && result?.image?.outputBase64
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
    if (imageStepId) {
      await AgentService.finishStep({
        stepId: imageStepId,
        success: Boolean(result?.success),
        output: { reply, generated: Boolean(result?.image?.outputBase64) },
        error: result?.success ? null : resultError || result?.message || null,
      });
    }
    await emitProgress(
      input.onProgress,
      result?.success && result?.image?.outputBase64
        ? { type: "image", content: reply }
        : { type: "text_delta", delta: reply },
    );

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
    const errorMessage =
      error instanceof Error ? error.message : "error desconocido";
    const reply = isAlmaImage
      ? `ALMA tuvo un error generando la imagen: ${errorMessage}`
      : "ALMA tuvo un error generando la imagen.";

    if (!assistantPersisted) {
      await persistAssistant(reply);
      await emitProgress(input.onProgress, {
        type: "text_delta",
        delta: reply,
      });
    }
    if (imageStepId) {
      await AgentService.finishStep({
        stepId: imageStepId,
        success: false,
        output: { reply },
        error: errorMessage,
      });
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

export type ProcessCanonicalChatRunInput = CanonicalChatRunInvocation;

async function prepareDurableInvocation(
  input: DurableChatRunInvocation,
): Promise<ChatRunResult | ChatRunTrackingContext> {
  const execution = await AgentExecutionRepository.findForDurableRun({
    id: input.executionId,
    userId: input.userId,
    agentId: input.agentId,
  });
  if (!execution)
    throw new Error("Durable execution was not found for this agent and user.");
  const tracking = { agentId: input.agentId, executionId: input.executionId };
  if (["completed", "failed", "cancelled"].includes(execution.status)) {
    const persisted = (execution.result ?? {}) as Record<string, unknown>;
    const finalContent =
      typeof persisted.finalContent === "string"
        ? persisted.finalContent
        : execution.error || "ALMA completed this execution.";
    return execution.status === "completed"
      ? {
          ok: true,
          responseType: "text",
          route: "chat",
          finalContent,
          assistantMessageId:
            typeof persisted.assistantMessageId === "string"
              ? persisted.assistantMessageId
              : undefined,
          tracking,
        }
      : {
          ok: false,
          responseType: "text",
          route: "chat",
          finalContent,
          tracking,
          code: "stream_failed",
          message: finalContent,
        };
  }
  if (execution.status === "running" || execution.status === "queued") {
    return tracking;
  }
  const claimed = await AgentExecutionRepository.claimPending(
    input.executionId,
    input.userId,
    input.agentId,
  );
  if (!claimed) {
    return {
      ok: false,
      responseType: "text",
      route: "chat",
      tracking,
      code: "execution_in_progress",
      message: "This execution is already running.",
    };
  }
  return tracking;
}

/**
 * The top-level server-only ALMA chat processor. Planner, tool, finance, and
 * image branches are delegated to their existing canonical processor; this
 * function owns the one remaining freeform Responses API execution path.
 */
export async function processCanonicalChatRun(
  input: ProcessCanonicalChatRunInput,
): Promise<ChatRunResult> {
  const durable =
    input.invocationMode === "durable"
      ? await prepareDurableInvocation(input)
      : null;
  if (durable && "ok" in durable) return durable;
  const { processPlannerAndToolChatRun } =
    await import("./processPlannerAndToolChatRun");
  const routed = await processPlannerAndToolChatRun({
    ...input,
    tracking: durable && "executionId" in durable ? durable : undefined,
  });
  if (routed.handled) return routed.result;

  let assistantPersisted = false;
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const stream = await client.responses.create({
      model: (await import("@/lib/alma/modelRouter")).chooseAlmaModel(
        input.userMessage,
        "auto",
      ),
      stream: true,
      input: [
        { role: "system", content: routed.systemPrompt },
        { role: "user", content: input.userMessage },
      ],
    });
    let fullReply = "";
    for await (const event of stream as any) {
      if (event.type === "response.output_text.delta") {
        fullReply += event.delta;
        await emitProgress(input.onProgress, {
          type: "text_delta",
          delta: event.delta,
        });
      }
    }

    const assistantMessage = await MessageRepository.create(
      input.conversationId,
      input.userId,
      "assistant",
      fullReply,
      {
        executionId: routed.tracking?.executionId,
        idempotencyKey: routed.tracking?.executionId
          ? `assistant:${routed.tracking.executionId}`
          : undefined,
      },
    );
    assistantPersisted = true;
    const result: ChatRunSuccessResult = {
      ok: true,
      responseType: "text",
      route: "chat",
      finalContent: fullReply,
      assistantMessageId:
        typeof assistantMessage?.id === "string"
          ? assistantMessage.id
          : undefined,
      tracking: routed.tracking,
    };
    await completeChatRunTracking({
      tracked: routed.tracking,
      userId: input.userId,
      success: true,
      summary: "ALMA completed a chat execution.",
      result: {
        route: "chat",
        finalContent: fullReply,
        assistantMessageId: result.assistantMessageId ?? null,
      },
    });
    await emitProgress(input.onProgress, { type: "completed", result });
    return result;
  } catch (error) {
    console.error("ALMA_CHAT_EXECUTION_ERROR", error);
    const reply =
      input.language === "en"
        ? "ALMA had an error generating the response."
        : "ALMA tuvo un error generando la respuesta.";
    let persistenceError: unknown = null;
    if (!assistantPersisted) {
      try {
        await MessageRepository.create(
          input.conversationId,
          input.userId,
          "assistant",
          reply,
          {
            executionId: routed.tracking?.executionId,
            idempotencyKey: routed.tracking?.executionId
              ? `assistant:${routed.tracking.executionId}`
              : undefined,
            status: "failed",
          },
        );
        assistantPersisted = true;
        await emitProgress(input.onProgress, {
          type: "text_delta",
          delta: `\n\n${reply}`,
        });
      } catch (persistError) {
        persistenceError = persistError;
        console.error("ALMA_ASSISTANT_PERSISTENCE_ERROR", persistError);
      }
    }
    const failure: ChatRunFailureResult = {
      ok: false,
      responseType: "text",
      route: "chat",
      finalContent: reply,
      tracking: routed.tracking,
      code: "stream_failed",
      message: reply,
    };
    await completeChatRunTracking({
      tracked: routed.tracking,
      userId: input.userId,
      success: false,
      summary: "ALMA chat execution failed.",
      error:
        error instanceof Error ? error.message : "Streaming response failed",
    });
    await emitProgress(input.onProgress, { type: "failed", error: failure });
    if (persistenceError) throw persistenceError;
    return failure;
  }
}

/** Server-only durable-worker entry point; deliberately has no progress callback. */
export async function runDurableChatRun(
  input: Omit<DurableChatRunInvocation, "onProgress" | "invocationMode">,
) {
  return processCanonicalChatRun({ ...input, invocationMode: "durable" });
}
