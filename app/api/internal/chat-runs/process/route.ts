import { createAdminClient } from "@/lib/supabase/admin";
import { runDurableChatRun } from "@/lib/alma/chat/processChatRun";

export async function POST(request: Request) {
  if (!process.env.CHAT_RUN_WORKER_SECRET || request.headers.get("x-chat-run-worker-secret") !== process.env.CHAT_RUN_WORKER_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { run } = await request.json();
  if (!run?.id || !run?.claim_token) return new Response("Invalid run", { status: 400 });
  const admin = createAdminClient();
  const { data: message, error } = await admin.from("messages").select("content").eq("id", run.user_message_id).eq("user_id", run.user_id).single();
  if (error || !message) return new Response("User message not found", { status: 404 });
  const result = await runDurableChatRun({ userId: run.user_id, agentId: run.agent_id, conversationId: run.conversation_id, executionId: run.execution_id, userMessageId: run.user_message_id, userMessage: message.content, idempotencyKey: run.idempotency_key, language: "auto" });
  const rpc = result.ok ? "complete_chat_run" : "fail_chat_run";
  const args = result.ok ? { p_id: run.id, p_token: run.claim_token } : { p_id: run.id, p_token: run.claim_token, p_error: result.message, p_retry: result.code !== "execution_in_progress" };
  const { error: finishError } = await admin.rpc(rpc, args);
  if (finishError) throw finishError;
  return Response.json({ runId: run.id, ok: result.ok });
}
