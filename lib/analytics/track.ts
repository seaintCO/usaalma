import { createClient } from "@/lib/supabase/server";

export async function trackEvent(userId:string | null | undefined, event:string, metadata:any = {}) {
  try {
    const supabase = await createClient();

    await supabase.from("alma_analytics_events").insert({
      user_id:userId || null,
      event,
      metadata
    });
  } catch (err) {
    console.error("ANALYTICS_ERROR", err);
  }
}
