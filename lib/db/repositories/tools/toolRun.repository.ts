import { createClient } from "@/lib/supabase/server";
import { redactExecutionData } from "@/lib/alma/security/redactExecutionData";

export class ToolRunRepository {
  static async create(userId:string, toolName:string, args:any, result:any) {
    const supabase = await createClient();

    await supabase.from("tool_runs").insert({
      user_id: userId,
      tool_name: toolName,
      arguments: redactExecutionData(args ?? {}),
      result: redactExecutionData(result ?? {}),
      success: Boolean(result?.success),
    });
  }
}
