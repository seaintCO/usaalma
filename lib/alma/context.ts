import { createClient } from "@/lib/supabase/server";

export async function getAlmaContext(userId:string, conversationId:string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("alma_context_state")
    .select("*")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .maybeSingle();

  return data;
}

export async function upsertAlmaContext(userId:string, conversationId:string, patch:any) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("alma_context_state")
    .upsert({
      user_id: userId,
      conversation_id: conversationId,
      ...patch,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,conversation_id" })
    .select()
    .single();

  if (error) console.error("ALMA_CONTEXT_ERROR", error);
  return data;
}

export async function logAlmaExecution(input:any) {
  const supabase = await createClient();

  await supabase.from("alma_executions").insert({
    user_id: input.userId,
    conversation_id: input.conversationId,
    intent: input.intent,
    status: input.status || "completed",
    steps: input.steps || [],
    result: input.result || {},
    error: input.error || null,
    completed_at: input.completedAt || new Date().toISOString(),
  });
}
