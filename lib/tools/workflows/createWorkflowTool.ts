import { WorkflowRepository } from "@/lib/db/repositories/workflows/workflow.repository";

export async function createWorkflowTool(userId:string, name:string) {
  const workflow = await WorkflowRepository.create(userId, name, "manual");

  return {
    success:true,
    message:`Workflow creado: ${workflow.name}`,
    workflow,
  };
}
