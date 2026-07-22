import { createAdminClient } from "@/lib/supabase/admin";
import { runDurableChatRun } from "@/lib/alma/chat/processChatRun";
import {
  isRuntimeConfigError,
  safeRuntimeConfigErrorBody,
} from "@/lib/runtime/config";
import { resolveAlmaMode } from "@/lib/usage/modes";

export async function POST(request: Request) {
  if (
    !process.env.CHAT_RUN_WORKER_SECRET ||
    request.headers.get("x-chat-run-worker-secret") !==
      process.env.CHAT_RUN_WORKER_SECRET
  ) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { run } = await request.json();
  if (!run?.id || !run?.claim_token)
    return new Response("Invalid run", { status: 400 });
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    if (isRuntimeConfigError(error)) {
      console.error("ALMA_CHAT_RUN_PROCESS_CONFIG_ERROR", {
        runId: run.id,
        capability: error.readiness.capability,
        missing: error.readiness.missing,
        invalid: error.readiness.invalid,
      });
      return Response.json(safeRuntimeConfigErrorBody(error), { status: 503 });
    }
    throw error;
  }
  const { data: message, error } = await admin
    .from("messages")
    .select("content")
    .eq("id", run.user_message_id)
    .eq("user_id", run.user_id)
    .single();
  if (error || !message)
    return new Response("User message not found", { status: 404 });
  const result = await runDurableChatRun({
    userId: run.user_id,
    agentId: run.agent_id,
    conversationId: run.conversation_id,
    executionId: run.execution_id,
    userMessageId: run.user_message_id,
    userMessage: message.content,
    idempotencyKey: run.idempotency_key,
    language: "auto",
    mode: resolveAlmaMode(run.alma_mode),
  });
  // The Edge worker exclusively owns claim-token lifecycle transitions. This
  // endpoint only invokes the canonical processor and reports its result.
  return Response.json({ runId: run.id, ok: result.ok });
}
