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

  static async addStep(userId:string, workflowId:string, step:any) {
    const supabase = await createClient();

    const { data: workflow, error:getError } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .eq("user_id", userId)
      .single();

    if (getError) throw getError;

    const steps = Array.isArray(workflow.steps) ? workflow.steps : [];

    const updatedSteps = [
      ...steps,
      {
        id: crypto.randomUUID(),
        type: step.type ?? "task",
        label: step.label ?? "Nueva acción",
        config: step.config ?? {},
      },
    ];

    const { data, error } = await supabase
      .from("workflows")
      .update({ steps: updatedSteps })
      .eq("id", workflowId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  }
}
