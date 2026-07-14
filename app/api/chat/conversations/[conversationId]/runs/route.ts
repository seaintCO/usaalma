import { getCurrentUser } from "@/lib/auth/user";
import { createAdminClient } from "@/lib/supabase/admin";
export async function GET(_request: Request, ctx: { params: Promise<{ conversationId: string }> }) {
  const user = await getCurrentUser(); if (!user) return new Response("Unauthorized", { status: 401 }); const { conversationId } = await ctx.params;
  const admin = createAdminClient();
  const { data, error } = await admin.from("chat_runs").select("id,status,execution_id,last_error,updated_at").eq("conversation_id", conversationId).eq("user_id", user.id).order("updated_at", { ascending: false });
  if (error) throw error;
  const executionIds = (data ?? []).map((run) => run.execution_id);
  const { data: assistantMessages, error: messageError } = executionIds.length
    ? await admin.from("messages").select("id,execution_id,content,status,created_at,updated_at").in("execution_id", executionIds).eq("role", "assistant")
    : { data: [], error: null };
  if (messageError) throw messageError;
  const messagesByExecution = new Map((assistantMessages ?? []).map((message) => [message.execution_id, message]));
  return Response.json((data ?? []).map((run) => ({
    runId: run.id,
    executionId: run.execution_id,
    status: run.status,
    error: run.last_error ?? null,
    updatedAt: run.updated_at,
    assistantMessage: messagesByExecution.get(run.execution_id) ?? null,
  })));
}
