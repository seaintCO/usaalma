import { createClient } from "@/lib/supabase/server";

export class CallLogRepository {
  static async create(data:any) {
    const supabase = await createClient();

    await supabase.from("call_logs").insert({
      phone_from:data.from ?? "",
      phone_to:data.to ?? "",
      speech_result:data.speech ?? "",
      call_sid:data.callSid ?? "",
      status:data.status ?? "received",
    });
  }
}
