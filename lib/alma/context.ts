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

export async function logAlmaBrainRun(input:any) {
  const supabase = await createClient();

  await supabase.from("alma_brain_runs").insert({
    user_id: input.userId,
    conversation_id: input.conversationId,
    user_message: input.userMessage,
    intent: input.intent,
    plan: input.plan || {},
    tool_used: input.toolUsed,
    result: input.result || {},
    success: input.success || false,
  });
}
