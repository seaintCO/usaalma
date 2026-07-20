import { getCurrentUser } from "@/lib/auth/user";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isRuntimeConfigError,
  safeRuntimeConfigErrorBody,
} from "@/lib/runtime/config";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ runId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { runId } = await ctx.params;
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    if (isRuntimeConfigError(error)) {
      console.error("ALMA_CHAT_RUN_STATUS_CONFIG_ERROR", {
        runId,
        capability: error.readiness.capability,
        missing: error.readiness.missing,
        invalid: error.readiness.invalid,
      });
      return Response.json(safeRuntimeConfigErrorBody(error), {
        status: 503,
      });
    }
    throw error;
  }
  const { data, error } = await admin
    .from("chat_runs")
    .select(
      "*,messages!chat_runs_user_message_id_fkey(content),agent_executions(result,error,status)",
    )
    .eq("id", runId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    console.error("ALMA_CHAT_RUN_STATUS_ERROR", {
      runId,
      category: "server_unavailable",
      error: error.message,
    });
    return Response.json(
      { error: { category: "server_unavailable" } },
      { status: 503 },
    );
  }
  if (!data) return new Response("Not found", { status: 404 });
  const { data: assistantMessage } = await admin
    .from("messages")
    .select("id,content,status,created_at,updated_at")
    .eq("execution_id", data.execution_id)
    .eq("role", "assistant")
    .maybeSingle();
  return Response.json({ ...data, assistantMessage });
}
