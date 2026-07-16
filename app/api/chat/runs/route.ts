import { getCurrentUser } from "@/lib/auth/user";
import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";
import { ConversationRepository } from "@/lib/db/repositories/conversation.repository";
import { AgentService } from "@/lib/services/agents/agent.service";
import { createAdminClient } from "@/lib/supabase/admin";

type ChatRunRequestBody = {
  message?: unknown;
  conversationId?: unknown;
  idempotencyKey?: unknown;
  language?: unknown;
};

function safeLogError(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 240) : "unknown";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const subscription = await SubscriptionRepository.get(user.id);
  if (!subscription || !["active", "trialing"].includes(subscription.status)) {
    return new Response("Subscription inactive", { status: 402 });
  }

  let body: ChatRunRequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON request body", { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const idempotencyKey =
    typeof body.idempotencyKey === "string" && body.idempotencyKey.length >= 16
      ? body.idempotencyKey.slice(0, 160)
      : crypto.randomUUID();

  if (!message) return new Response("Message is required", { status: 400 });

  try {
    const agent = await AgentService.getOrCreateDefault(user.id);
    const admin = createAdminClient();
    const existingRunQuery = admin
      .from("chat_runs")
      .select("id,conversation_id,execution_id,user_message_id,status")
      .eq("user_id", user.id)
      .eq("agent_id", agent.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    const { data: existingRun, error: existingRunError } =
      await existingRunQuery;
    if (existingRunError) throw existingRunError;
    if (existingRun) {
      return Response.json({
        conversationId: existingRun.conversation_id,
        userMessageId: existingRun.user_message_id,
        executionId: existingRun.execution_id,
        runId: existingRun.id,
        status: existingRun.status,
      });
    }

    let conversationId =
      typeof body.conversationId === "string" ? body.conversationId : "";

    const { data: existingMessage, error: existingMessageError } = await admin
      .from("messages")
      .select("id,conversation_id")
      .eq("user_id", user.id)
      .eq("role", "user")
      .eq("idempotency_key", idempotencyKey)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingMessageError) throw existingMessageError;
    if (!conversationId && existingMessage?.conversation_id) {
      conversationId = existingMessage.conversation_id;
    }

    if (!conversationId) {
      conversationId = (
        await ConversationRepository.create(user.id, message.slice(0, 40))
      ).id;
    }

    let userMessage = existingMessage;
    if (!userMessage) {
      const { data, error } = await admin
        .from("messages")
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: "user",
          content: message,
          idempotency_key: idempotencyKey,
          status: "final",
        })
        .select("id,conversation_id")
        .single();
      if (error) throw error;
      userMessage = data;
    }

    const { data: existingExecution, error: existingExecutionError } =
      await admin
        .from("agent_executions")
        .select("id")
        .eq("user_id", user.id)
        .eq("agent_id", agent.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
    if (existingExecutionError) throw existingExecutionError;

    let execution = existingExecution;
    if (!execution) {
      const { data, error } = await admin
        .from("agent_executions")
        .insert({
          agent_id: agent.id,
          user_id: user.id,
          conversation_id: conversationId,
          user_message_id: userMessage.id,
          idempotency_key: idempotencyKey,
          trigger_type: "chat",
          status: "pending",
          goal: message,
          plan: {},
          result: {},
        })
        .select("id")
        .single();
      if (error) throw error;
      execution = data;
    }

    const { data: run, error: runError } = await admin
      .from("chat_runs")
      .insert({
        user_id: user.id,
        agent_id: agent.id,
        conversation_id: conversationId,
        execution_id: execution.id,
        user_message_id: userMessage.id,
        idempotency_key: idempotencyKey,
        status: "queued",
      })
      .select()
      .single();
    if (runError) throw runError;

    if (
      process.env.SUPABASE_FUNCTION_URL &&
      process.env.CHAT_RUN_WORKER_SECRET
    ) {
      fetch(process.env.SUPABASE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "x-chat-run-worker-secret": process.env.CHAT_RUN_WORKER_SECRET,
        },
      }).catch((error) =>
        console.error("ALMA_CHAT_RUN_TRIGGER_ERROR", {
          runId: run.id,
          category: "durable_enqueue_failed",
          error: safeLogError(error),
        }),
      );
    }

    return Response.json(
      {
        conversationId,
        userMessageId: userMessage.id,
        executionId: execution.id,
        runId: run.id,
        status: run.status,
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("ALMA_CHAT_RUN_ENQUEUE_ERROR", {
      userId: user.id,
      category: "durable_enqueue_failed",
      error: safeLogError(error),
    });
    return Response.json(
      { error: { category: "durable_enqueue_failed" } },
      { status: 503 },
    );
  }
}
