import { createClient } from "@/lib/supabase/server";
import { TaskRepository } from "@/lib/db/repositories/tasks/task.repository";

export class WorkflowRunService {
  static async run(userId:string, workflowId:string) {
    const supabase = await createClient();

    const { data: workflow, error } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    const steps = Array.isArray(workflow.steps) ? workflow.steps : [];
    const results:any[] = [];

    for (const step of steps) {
      if (step.type === "task") {
        const task = await TaskRepository.create(userId, step.label);
        results.push({ step: step.label, success:true, taskId: task.id });
      } else {
        results.push({ step: step.label, success:false, message:"Tipo de paso no soportado todavía." });
      }
    }

    const { data: run } = await supabase
      .from("workflow_runs")
      .insert({
        user_id:userId,
        workflow_id:workflowId,
        status:"completed",
        result:{ steps:results },
      })
      .select()
      .single();

    return run;
  }
}
