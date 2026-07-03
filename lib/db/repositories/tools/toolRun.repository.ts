import { createClient } from "@/lib/supabase/server";

export class ToolRunRepository {
  static async create(userId:string, toolName:string, args:any, result:any) {
    const supabase = await createClient();

    await supabase.from("tool_runs").insert({
      user_id: userId,
      tool_name: toolName,
      arguments: args ?? {},
      result: result ?? {},
      success: Boolean(result?.success),
    });
  }
}
