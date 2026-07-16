import "server-only";
import OpenAI from "openai";
import { chooseAlmaModel } from "@/lib/alma/modelRouter";
import { planAlmaAction } from "@/lib/alma/brain";
import { getAlmaContext } from "@/lib/alma/context";
import { buildContext } from "@/lib/ai/memory/context";
import { buildIntegrationContext } from "@/lib/ai/integrations/context";
import { buildRelevantDocumentContext } from "@/lib/ai/documents/context";
import { buildWorkspaceContext } from "@/lib/ai/workspaces/context";
import { selectAgent } from "@/lib/ai/agents/selector";
import { runPlannedExecution } from "@/lib/ai/planner/orchestrator";
import { classifyAlmaRoute } from "@/lib/ai/router/classifyAlmaRoute";
import { buildMarketAnalysisPrompt } from "@/lib/ai/finance/marketPrompt";
import { executeTool, toolDefinitions } from "@/lib/ai/tools/registry";
import { safeJsonParse } from "@/lib/ai/tools/utils";
import { MessageRepository } from "@/lib/db/repositories/message.repository";
import { AgentService } from "@/lib/services/agents/agent.service";
import { buildResponseLanguageInstruction } from "./chatExecutionHelpers";
import {
  completeChatRunTracking,
  processImageChatRun,
  resolveImageExecutionKind,
  startChatRunTracking,
  type ChatRunProgressCallback,
  type ChatRunResult,
  type ChatRunTrackingContext,
} from "./processChatRun";

export type PlannerToolChatRunInput = {
  userId: string;
  conversationId: string;
  userMessage: string;
  language: "en" | "es" | "auto";
  idempotencyKey?: string;
  tracking?: ChatRunTrackingContext;
  onProgress?: ChatRunProgressCallback;
};

export type PlannerToolChatRunResult =
  | { handled: true; result: ChatRunResult }
  | {
      handled: false;
      systemPrompt: string;
      tracking: ChatRunTrackingContext | null;
    };

function localized(
  input: PlannerToolChatRunInput,
  english: string,
  spanish: string,
) {
  return input.language === "en" ? english : spanish;
}

async function emit(
  callback: ChatRunProgressCallback | undefined,
  event: Parameters<ChatRunProgressCallback>[0],
) {
  if (!callback) return;
  try {
    await callback(event);
  } catch (error) {
    console.error("ALMA_CHAT_PROGRESS_ERROR", error);
  }
}

async function persistAssistant(
  input: PlannerToolChatRunInput,
  content: string,
) {
  await MessageRepository.create(
    input.conversationId,
    input.userId,
    "assistant",
    content,
    {
      executionId: input.tracking?.executionId,
      idempotencyKey: input.tracking?.executionId
        ? `assistant:${input.tracking.executionId}`
        : undefined,
    },
  );
}

async function completeHandled(
  input: PlannerToolChatRunInput,
  tracking: ChatRunTrackingContext | null,
  result: ChatRunResult,
  success: boolean,
  summary: string,
  error?: string,
) {
  await completeChatRunTracking({
    tracked: tracking,
    userId: input.userId,
    success,
    summary,
    result: result.ok ? { route: result.route } : undefined,
    error: error ?? (result.ok ? null : result.message),
  });
  await emit(
    input.onProgress,
    result.ok
      ? { type: "completed", result }
      : { type: "failed", error: result },
  );
  return { handled: true as const, result };
}

function plannedReply(
  input: PlannerToolChatRunInput,
  planned: {
    goal: string;
    steps: Array<{ label: string; result?: { message?: string } }>;
  },
) {
  const steps = planned.steps
    .map(
      (step, index) =>
        `${index + 1}. ${step.label} — ${input.language === "en" ? "Completed" : step.result?.message || "Completado"}`,
    )
    .join("\n");
  return input.language === "en"
    ? `Done. I created a plan for: ${planned.goal}\n\nActions completed:\n${steps}`
    : `Listo. Creé un plan para: ${planned.goal}\n\nAcciones ejecutadas:\n${steps}`;
}

/** Executes all non-freeform planner, router, finance, image, and tool paths. */
export async function processPlannerAndToolChatRun(
  input: PlannerToolChatRunInput,
): Promise<PlannerToolChatRunResult> {
  let almaContext: unknown = null;
  let almaPlan;
  try {
    almaContext = await getAlmaContext(input.userId, input.conversationId);
    almaPlan = planAlmaAction(input.userMessage, almaContext);
  } catch (error) {
    console.error("ALMA_PLAN_CONTEXT_ERROR", error);
    almaPlan = planAlmaAction(input.userMessage);
  }

  if (resolveImageExecutionKind({ almaIntent: almaPlan.intent })) {
    const result = await processImageChatRun({
      ...input,
      almaIntent: almaPlan.intent,
      almaPlan,
      almaContext,
    });
    if (!result) throw new Error("Image route was not resolved");
    return { handled: true, result };
  }

  const tracking =
    input.tracking ??
    (await startChatRunTracking({
      userId: input.userId,
      conversationId: input.conversationId,
      intent: almaPlan.intent,
      goal: input.userMessage,
      plan: almaPlan,
      idempotencyKey: input.idempotencyKey,
    }));

  try {
    const planned = await runPlannedExecution(input.userId, input.userMessage);
    if (planned) {
      const reply = plannedReply(input, planned);
      if (input.onProgress) {
        for (const word of reply.split(" ")) {
          await emit(input.onProgress, {
            type: "text_delta",
            delta: `${word} `,
          });
          await new Promise((resolve) => setTimeout(resolve, 15));
        }
      }
      await persistAssistant(input, reply);
      const result: ChatRunResult = {
        ok: true,
        responseType: "planned_execution",
        route: "planned_execution",
        finalContent: reply,
        tracking,
      };
      return completeHandled(
        input,
        tracking,
        result,
        true,
        "ALMA completed a planned execution.",
      );
    }
  } catch (error) {
    console.error("ALMA_PLANNER_ERROR", error);
  }

  let detectedIntent: Awaited<ReturnType<typeof classifyAlmaRoute>> = "chat";
  try {
    detectedIntent = await classifyAlmaRoute(input.userMessage);
  } catch (error) {
    console.error("ALMA_ROUTER_ERROR", error);
  }

  if (detectedIntent === "finance_analysis") {
    await emit(input.onProgress, {
      type: "status",
      message: localized(
        input,
        "Preparing market analysis...\n\n",
        "Preparando análisis de mercado...\n\n",
      ),
    });
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const result: any = await client.responses.create({
        model: chooseAlmaModel(input.userMessage, "auto"),
        input: `${buildMarketAnalysisPrompt("Chart / Market", input.userMessage)}\n\n${buildResponseLanguageInstruction(input.userMessage, input.language)}`,
      });
      const reply =
        result.output_text ||
        localized(
          input,
          "No market analysis available.",
          "No hay análisis de mercado disponible.",
        );
      await persistAssistant(input, reply);
      await emit(input.onProgress, { type: "text_delta", delta: reply });
      const terminal: ChatRunResult = {
        ok: true,
        responseType: "finance_analysis",
        route: "finance_analysis",
        finalContent: reply,
        tracking,
      };
      return completeHandled(
        input,
        tracking,
        terminal,
        true,
        "ALMA completed market analysis.",
      );
    } catch {
      const reply = localized(
        input,
        "ALMA could not generate market analysis right now.",
        "ALMA no pudo generar el análisis de mercado ahora.",
      );
      await persistAssistant(input, reply);
      await emit(input.onProgress, { type: "text_delta", delta: reply });
      const terminal: ChatRunResult = {
        ok: false,
        responseType: "finance_analysis",
        route: "finance_analysis",
        finalContent: reply,
        tracking,
        code: "model_request_failed",
        message: reply,
      };
      return completeHandled(
        input,
        tracking,
        terminal,
        false,
        "ALMA market analysis failed.",
        reply,
      );
    }
  }

  if (resolveImageExecutionKind({ routeIntent: detectedIntent })) {
    const result = await processImageChatRun({
      ...input,
      almaIntent: almaPlan.intent,
      almaPlan,
      almaContext,
      routeIntent: detectedIntent,
      tracking,
    });
    if (!result) throw new Error("Image route was not resolved");
    return { handled: true, result };
  }

  const memoryContext = await buildContext(input.userId, input.userMessage);
  const [integrationContext, documentContext, workspaceContext] =
    await Promise.all([
      buildIntegrationContext(input.userId),
      buildRelevantDocumentContext(input.userId, input.userMessage),
      buildWorkspaceContext(input.userId),
    ]);
  const selectedAgent = selectAgent(input.userMessage);
  const systemPrompt = `
${selectedAgent.system}

Active Agent:
${selectedAgent.name}

Agent Description:
${selectedAgent.description}

You are ALMA, a personal and business assistant created by SEAINT.
Never say that you are ChatGPT.
Be clear, practical, elegant, and helpful.
${buildResponseLanguageInstruction(input.userMessage, input.language)}

Puedes usar herramientas reales. Si el usuario pide crear, generar, dibujar, diseñar, visualizar, hacer una imagen, logo, foto, anuncio, producto visual o editar una imagen, usa la herramienta generate_image. No solo expliques; genera la imagen cuando sea claramente una petición visual.

Puedes usar herramientas reales para crear:
- tareas
- notas
- contactos CRM
- facturas

Si el usuario pide una acción, usa la herramienta correcta.

Integraciones conectadas:
${integrationContext}

Workspaces:
${workspaceContext}

Documentos guardados:
${documentContext}

Memoria del usuario:
${memoryContext || "Sin memoria guardada todavía."}
`;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let firstResponse: any;
  try {
    firstResponse = await client.responses.create({
      model: chooseAlmaModel(input.userMessage, "auto"),
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input.userMessage },
      ],
      tools: toolDefinitions,
      tool_choice: "auto",
    });
  } catch (error) {
    console.error("ALMA_TOOL_DISCOVERY_ERROR", error);
    return { handled: false, systemPrompt, tracking };
  }

  const toolCalls = (firstResponse.output || []).filter(
    (item: any) => item.type === "function_call",
  );
  if (!toolCalls.length) return { handled: false, systemPrompt, tracking };

  const toolResults: any[] = [];
  for (const [toolIndex, call] of toolCalls.entries()) {
    const args = call.arguments ? safeJsonParse(call.arguments) : {};
    let toolResult: any;
    if (tracking) {
      const claimed = await AgentService.claimStep({
        executionId: tracking.executionId,
        sequence: toolIndex + 2,
        kind: "tool",
        toolName: call.name,
        input: args,
      });
      if (!claimed.claimed) {
        if (claimed.step.status === "completed") {
          toolResult = (claimed.step.output as { result?: unknown })
            ?.result ?? {
            success: false,
            message: "A prior tool result is unavailable.",
          };
        } else {
          toolResult = {
            success: false,
            message: "This tool action is already running.",
          };
        }
      } else {
        toolResult = await executeTool(input.userId, call.name, args, {
          executionId: tracking.executionId,
        });
        await AgentService.finishStep({
          stepId: claimed.step.id,
          success: Boolean(toolResult?.success),
          output: { result: toolResult },
          error: toolResult?.success ? null : toolResult?.message || null,
        });
      }
    } else {
      toolResult = await executeTool(input.userId, call.name, args);
    }
    toolResults.push({
      type: "function_call_output",
      call_id: call.call_id,
      output: JSON.stringify(toolResult),
    });
  }

  let fullReply = "";
  try {
    const finalStream = await client.responses.create({
      model: chooseAlmaModel(input.userMessage, "auto"),
      stream: true,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input.userMessage },
        ...toolCalls,
        ...toolResults,
      ],
    });
    for await (const event of finalStream as any) {
      if (event.type === "response.output_text.delta") {
        fullReply += event.delta;
        await emit(input.onProgress, {
          type: "text_delta",
          delta: event.delta,
        });
      }
    }
    await persistAssistant(input, fullReply);
    const terminal: ChatRunResult = {
      ok: true,
      responseType: "tool_assisted",
      route: "tool_assisted",
      finalContent: fullReply,
      tracking,
      tools: {
        calls: toolResults.length,
        names: toolCalls.map((call: any) => call.name),
      },
    };
    return completeHandled(
      input,
      tracking,
      terminal,
      true,
      "ALMA completed a tool-assisted chat execution.",
    );
  } catch {
    const reply = localized(
      input,
      "\n\nALMA had an error executing the tool.",
      "\n\nALMA tuvo un error ejecutando la herramienta.",
    );
    await persistAssistant(input, reply);
    await emit(input.onProgress, { type: "text_delta", delta: reply });
    const terminal: ChatRunResult = {
      ok: false,
      responseType: "tool_assisted",
      route: "tool_assisted",
      finalContent: reply,
      tracking,
      code: "tool_execution_failed",
      message: reply,
    };
    return completeHandled(
      input,
      tracking,
      terminal,
      false,
      "ALMA tool-assisted chat execution failed.",
      "Streaming tool response failed",
    );
  }
}
