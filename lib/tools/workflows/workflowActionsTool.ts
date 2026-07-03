import { WorkflowRepository } from "@/lib/db/repositories/workflows/workflow.repository";
import { WorkflowRunService } from "@/lib/services/workflows/workflowRun.service";

export async function addWorkflowStepTool(userId:string, workflowId:string, label:string, type:string = "task") {
  const workflow = await WorkflowRepository.addStep(userId, workflowId, {
    type,
    label,
    config:{},
  });

  return {
    success:true,
    message:`Paso agregado al workflow: ${label}`,
    workflow,
  };
}

export async function runWorkflowTool(userId:string, workflowId:string) {
  const run = await WorkflowRunService.run(userId, workflowId);

  return {
    success:true,
    message:"Workflow ejecutado correctamente.",
    run,
  };
}
