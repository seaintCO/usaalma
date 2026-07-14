import { getCurrentUser } from "@/lib/auth/user";
import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";
import { ConversationRepository } from "@/lib/db/repositories/conversation.repository";
import { AgentService } from "@/lib/services/agents/agent.service";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const subscription = await SubscriptionRepository.get(user.id);
  if (!subscription || !["active", "trialing"].includes(subscription.status)) return new Response("Subscription inactive", { status: 402 });
  let body: { message?: unknown; conversationId?: unknown; idempotencyKey?: unknown; language?: unknown };
  try { body = await request.json(); } catch { return new Response("Invalid JSON request body", { status: 400 }); }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const idempotencyKey = typeof body.idempotencyKey === "string" && body.idempotencyKey.length >= 16 ? body.idempotencyKey : crypto.randomUUID();
  if (!message) return new Response("Message is required", { status: 400 });
  const agent = await AgentService.getOrCreateDefault(user.id);
  const admin = createAdminClient();
  const { data: existingRun } = await admin.from("chat_runs").select("id,conversation_id,execution_id,user_message_id,status").eq("user_id", user.id).eq("agent_id", agent.id).eq("idempotency_key", idempotencyKey).maybeSingle();
  if (existingRun) return Response.json({ conversationId: existingRun.conversation_id, userMessageId: existingRun.user_message_id, executionId: existingRun.execution_id, runId: existingRun.id, status: existingRun.status });
  let conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
  if (!conversationId) conversationId = (await ConversationRepository.create(user.id, message.slice(0, 40))).id;
  const { data: userMessage, error: messageError } = await admin.from("messages").insert({ conversation_id: conversationId, user_id: user.id, role: "user", content: message, idempotency_key: idempotencyKey, status: "final" }).select().single();
  if (messageError) throw messageError;
  const { data: execution, error: executionError } = await admin.from("agent_executions").insert({ agent_id: agent.id, user_id: user.id, conversation_id: conversationId, user_message_id: userMessage.id, idempotency_key: idempotencyKey, trigger_type: "chat", status: "pending", goal: message, plan: {}, result: {} }).select().single();
  if (executionError) throw executionError;
  const { data: run, error: runError } = await admin.from("chat_runs").insert({ user_id: user.id, agent_id: agent.id, conversation_id: conversationId, execution_id: execution.id, user_message_id: userMessage.id, idempotency_key: idempotencyKey, status: "queued" }).select().single();
  if (runError) throw runError;
  if (process.env.SUPABASE_FUNCTION_URL && process.env.CHAT_RUN_WORKER_SECRET) {
    fetch(process.env.SUPABASE_FUNCTION_URL, { method: "POST", headers: { "x-chat-run-worker-secret": process.env.CHAT_RUN_WORKER_SECRET } }).catch((error) => console.error("ALMA_CHAT_RUN_TRIGGER_ERROR", { runId: run.id, error: error instanceof Error ? error.message : "trigger failed" }));
  }
  return Response.json({ conversationId, userMessageId: userMessage.id, executionId: execution.id, runId: run.id, status: run.status }, { status: 202 });
}
