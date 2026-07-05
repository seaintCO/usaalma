import { createClient } from "@/lib/supabase/server";

export async function rememberEvent(input:{
  userId:string;
  module:string;
  eventType:string;
  title:string;
  summary?:string;
  metadata?:any;
}) {
  try {
    const supabase = await createClient();

    await supabase.from("alma_memory_events").insert({
      user_id:input.userId,
      module:input.module,
      event_type:input.eventType,
      title:input.title,
      summary:input.summary || null,
      metadata:input.metadata || {},
    });
  } catch (err) {
    console.error("ALMA_MEMORY_SAVE_ERROR", err);
  }
}

export async function getRecentMemory(userId:string, limit = 12) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("alma_memory_events")
    .select("module,event_type,title,summary,metadata,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending:false })
    .limit(limit);

  return data || [];
}
