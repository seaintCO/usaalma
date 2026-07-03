import { executeTool } from "@/lib/ai/tools/registry";
import { createSimplePlan } from "./simplePlanner";

export async function runPlannedExecution(userId:string, message:string) {
  const plan = createSimplePlan(message);

  if (!plan.steps.length) {
    return null;
  }

  const results = [];

  for (const step of plan.steps) {
    const result = await executeTool(userId, step.tool, step.args);

    results.push({
      label: step.label,
      tool: step.tool,
      result,
    });
  }

  return {
    success: true,
    goal: plan.goal,
    steps: results,
  };
}
