import { createClient } from "@/lib/supabase/server";

export class WorkflowRepository {
  static async list(userId:string) {
    const supabase = await createClient();

    const { data } = await supabase
      .from("workflows")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending:false });

    return data ?? [];
  }

  static async create(userId:string, name:string, triggerType:string = "manual") {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("workflows")
      .insert({
        user_id:userId,
        name,
        trigger_type:triggerType,
        status:"draft",
        steps:[],
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  }
}
